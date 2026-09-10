const prisma = require('../lib/prisma');
const { getSettings } = require('./settingsService');
const { deriveOvertimeForAttendanceRecord } = require('./overtimeService');
const { toDateOnly, todayDateOnly, dayOfWeek, timeStringToMinutes, addDays } = require('../utils/dateUtils');
const { fetchPunches } = require('./zktecoClient');

// Attaches "HH:mm" (local server time) to a given calendar date.
function atLocalTime(dateOnly, hhmm) {
  const minutes = timeStringToMinutes(hhmm);
  const d = new Date(dateOnly);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

async function getApprovedLeaveEmployeeIds(dateOnly) {
  const leaves = await prisma.leaveRequest.findMany({
    where: { status: 'APPROVED', startDate: { lte: dateOnly }, endDate: { gte: dateOnly } },
    select: { id: true, employeeId: true },
  });
  const map = new Map();
  leaves.forEach((l) => map.set(l.employeeId, l.id));
  return map;
}

async function getHolidayForDate(dateOnly) {
  return prisma.holiday.findUnique({ where: { date: dateOnly } });
}

function computeStatusFromPunches(checkIn, checkOut, dateOnly, settings) {
  if (!checkIn) return { status: 'ABSENT', checkIn: null, checkOut: null };

  const graceEnd = atLocalTime(dateOnly, settings.shiftStart);
  graceEnd.setMinutes(graceEnd.getMinutes() + settings.gracePeriodMinutes);
  const isLate = checkIn.getTime() > graceEnd.getTime();

  let workedHours = null;
  if (checkOut && checkOut.getTime() > checkIn.getTime()) {
    workedHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
  }

  let status;
  if (workedHours !== null && workedHours < settings.halfDayThresholdHrs) {
    status = 'HALF_DAY';
  } else if (isLate) {
    status = 'LATE';
  } else {
    status = 'PRESENT';
  }

  return { status, checkIn, checkOut: checkOut || null };
}

// Computes what a single employee's attendance record for `dateOnly` should
// be, given punches already imported into DevicePunch. Does not touch the
// database. `finalize=true` means "the day is over, treat no punches as
// ABSENT"; otherwise a punch-less day-in-progress is left alone (null).
async function deriveForEmployeeDate(employee, dateOnly, { settings, approvedLeaveMap, holiday, finalize }) {
  if (approvedLeaveMap.has(employee.id)) {
    return { status: 'LEAVE', checkIn: null, checkOut: null, leaveRequestId: approvedLeaveMap.get(employee.id) };
  }
  if (holiday) {
    return { status: 'HOLIDAY', checkIn: null, checkOut: null };
  }
  if (settings.weeklyHolidays.includes(dayOfWeek(dateOnly))) {
    return { status: 'WEEKEND', checkIn: null, checkOut: null };
  }

  const punches = await prisma.devicePunch.findMany({
    where: {
      employeeCode: employee.employeeCode,
      timestamp: { gte: dateOnly, lt: addDays(dateOnly, 1) },
    },
    orderBy: { timestamp: 'asc' },
  });

  if (punches.length === 0) {
    if (!finalize) return null;
    return { status: 'ABSENT', checkIn: null, checkOut: null };
  }

  const checkIn = punches[0].timestamp;
  const checkOut = punches.length > 1 ? punches[punches.length - 1].timestamp : null;
  return computeStatusFromPunches(checkIn, checkOut, dateOnly, settings);
}

// Writes the derived result, unless the existing record was a manual HR
// correction (those are never silently overwritten by the sync job).
async function upsertDerived(employee, dateOnly, derived, settings) {
  const existing = await prisma.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: dateOnly } },
  });
  if (existing && existing.isManualEntry) return existing;

  const data = {
    status: derived.status,
    checkIn: derived.checkIn,
    checkOut: derived.checkOut,
    leaveRequestId: derived.leaveRequestId || null,
    isManualEntry: false,
  };

  const record = existing
    ? await prisma.attendanceRecord.update({ where: { id: existing.id }, data })
    : await prisma.attendanceRecord.create({ data: { employeeId: employee.id, date: dateOnly, ...data } });

  await deriveOvertimeForAttendanceRecord(record, settings);
  return record;
}

// Pulls punches from the ZKTeco device, stores any new ones, and refreshes
// today's (in-progress) attendance for every employee who punched.
async function syncFromDevice() {
  const punches = await fetchPunches();
  if (punches.length === 0) return { imported: 0, employeesUpdated: 0 };

  const created = await prisma.devicePunch.createMany({
    data: punches.map((p) => ({ employeeCode: p.employeeCode, timestamp: p.timestamp, verifyMode: p.verifyMode, raw: p.raw })),
    skipDuplicates: true,
  });

  const settings = await getSettings();
  const touchedDates = new Set(punches.map((p) => toDateOnly(p.timestamp).toISOString()));
  const touchedCodes = new Set(punches.map((p) => p.employeeCode));

  const employees = await prisma.employee.findMany({
    where: { employeeCode: { in: [...touchedCodes] }, employmentStatus: 'ACTIVE' },
  });

  const today = todayDateOnly();
  let employeesUpdated = 0;
  for (const dateIso of touchedDates) {
    const dateOnly = new Date(dateIso);
    const finalize = dateOnly.getTime() < today.getTime();
    const approvedLeaveMap = await getApprovedLeaveEmployeeIds(dateOnly);
    const holiday = await getHolidayForDate(dateOnly);
    for (const employee of employees) {
      const derived = await deriveForEmployeeDate(employee, dateOnly, { settings, approvedLeaveMap, holiday, finalize });
      if (derived) {
        await upsertDerived(employee, dateOnly, derived, settings);
        employeesUpdated += 1;
      }
    }
  }

  return { imported: created.count, employeesUpdated };
}

// Nightly job: for the day that just ended, fill in ABSENT for every active
// employee that has no record yet (never punched at all that day).
async function finalizeDay(dateOnly) {
  const settings = await getSettings();
  const approvedLeaveMap = await getApprovedLeaveEmployeeIds(dateOnly);
  const holiday = await getHolidayForDate(dateOnly);
  const employees = await prisma.employee.findMany({ where: { employmentStatus: 'ACTIVE' } });

  let updated = 0;
  for (const employee of employees) {
    const derived = await deriveForEmployeeDate(employee, dateOnly, {
      settings,
      approvedLeaveMap,
      holiday,
      finalize: true,
    });
    if (derived) {
      await upsertDerived(employee, dateOnly, derived, settings);
      updated += 1;
    }
  }
  return { updated };
}

// Recomputes a single employee/date on demand (e.g. after a leave is
// approved retroactively, or to preview what auto-derivation would produce).
async function recalculateOne(employeeId, dateOnly) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return null;
  const settings = await getSettings();
  const approvedLeaveMap = await getApprovedLeaveEmployeeIds(dateOnly);
  const holiday = await getHolidayForDate(dateOnly);
  const today = todayDateOnly();
  const derived = await deriveForEmployeeDate(employee, dateOnly, {
    settings,
    approvedLeaveMap,
    holiday,
    finalize: dateOnly.getTime() <= today.getTime(),
  });
  if (!derived) return null;
  return upsertDerived(employee, dateOnly, derived, settings);
}

// Builds a day-by-day sheet for one employee/month, backfilling any past
// day that's missing a record (e.g. the nightly finalize job was down).
// Never fabricates days beyond today.
async function buildMonthlySheetForEmployee(employeeId, month, year) {
  const { daysInMonth } = require('../utils/dateUtils');
  const total = daysInMonth(year, month);
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month - 1, total));
  const today = todayDateOnly();

  const existing = await prisma.attendanceRecord.findMany({
    where: { employeeId, date: { gte: from, lte: to } },
  });
  const byDate = new Map(existing.map((r) => [r.date.toISOString(), r]));

  const days = [];
  for (let d = 1; d <= total; d += 1) {
    const dateOnly = new Date(Date.UTC(year, month - 1, d));
    if (dateOnly.getTime() > today.getTime()) break;
    let record = byDate.get(dateOnly.toISOString());
    if (!record) {
      record = await recalculateOne(employeeId, dateOnly);
    }
    if (record) days.push(record);
  }
  return days;
}

module.exports = { syncFromDevice, finalizeDay, recalculateOne, toDateOnly, buildMonthlySheetForEmployee };
