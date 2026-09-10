const prisma = require('../lib/prisma');
const { toDateOnly, addDays, dayOfWeek } = require('../utils/dateUtils');
const { getSettings } = require('./settingsService');
const { recalculateOne } = require('./attendanceService');

// Inclusive day count between two dates, excluding the company's weekly
// holiday(s) (those days are never "spent" from an employee's leave).
async function computeLeaveDays(startDate, endDate) {
  const settings = await getSettings();
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  let days = 0;
  for (let d = start; d.getTime() <= end.getTime(); d = addDays(d, 1)) {
    if (!settings.weeklyHolidays.includes(dayOfWeek(d))) days += 1;
  }
  return days;
}

async function getOrCreateBalance(employeeId, leaveTypeId, year) {
  const existing = await prisma.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
  });
  if (existing) return existing;

  const [employee, leaveType] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId } }),
    prisma.leaveType.findUnique({ where: { id: leaveTypeId } }),
  ]);
  const entitlement = employee.employmentType === 'PERMANENT' ? leaveType.entitlementPermanent : leaveType.entitlementTemporary;

  return prisma.leaveBalance.create({ data: { employeeId, leaveTypeId, year, entitlement, taken: 0 } });
}

// Marks every day in the range as LEAVE on the attendance sheet (unless it
// was already a manual HR entry, which recalculateOne/attendanceService
// respects) and increments the balance's taken count.
async function applyApprovedLeave(leaveRequest) {
  const year = leaveRequest.startDate.getFullYear();
  const balance = await getOrCreateBalance(leaveRequest.employeeId, leaveRequest.leaveTypeId, year);
  await prisma.leaveBalance.update({ where: { id: balance.id }, data: { taken: { increment: leaveRequest.days } } });

  for (let d = toDateOnly(leaveRequest.startDate); d.getTime() <= toDateOnly(leaveRequest.endDate).getTime(); d = addDays(d, 1)) {
    await recalculateOne(leaveRequest.employeeId, d);
  }
}

module.exports = { computeLeaveDays, getOrCreateBalance, applyApprovedLeave };
