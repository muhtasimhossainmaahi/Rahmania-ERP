const prisma = require('../lib/prisma');
const { timeStringToMinutes, toDateOnly } = require('../utils/dateUtils');

// Called after an attendance record is finalized for a day (status PRESENT
// or LATE with a check-out). Computes hours worked beyond shift end, capped
// per-day by settings, and upserts a PENDING OvertimeRecord for manager
// approval. If the employee worked no measurable overtime, any existing
// PENDING record for that day is removed (e.g. after a manual correction).
async function deriveOvertimeForAttendanceRecord(record, settings) {
  if (!['PRESENT', 'LATE', 'HALF_DAY'].includes(record.status) || !record.checkOut) {
    return null;
  }

  const shiftEndMinutes = timeStringToMinutes(settings.shiftEnd);
  const dateOnly = toDateOnly(record.date);

  // checkOut is a real timestamp (local server time); compare using local
  // hours/minutes against the configured shift end for that calendar day.
  const checkOutLocal = new Date(record.checkOut);
  const shiftEndLocal = new Date(checkOutLocal);
  shiftEndLocal.setHours(Math.floor(shiftEndMinutes / 60), shiftEndMinutes % 60, 0, 0);

  const overMs = checkOutLocal.getTime() - shiftEndLocal.getTime();
  let hours = overMs > 0 ? overMs / (1000 * 60 * 60) : 0;
  hours = Math.round(hours * 100) / 100;

  const existing = await prisma.overtimeRecord.findUnique({
    where: { employeeId_date: { employeeId: record.employeeId, date: dateOnly } },
  });

  if (hours <= 0) {
    if (existing && existing.status === 'PENDING') {
      await prisma.overtimeRecord.delete({ where: { id: existing.id } });
    }
    return null;
  }

  const cappedHours = Math.min(hours, settings.otDailyCapHours);

  if (existing) {
    if (existing.status !== 'PENDING') return existing; // already decided, don't silently change it
    return prisma.overtimeRecord.update({
      where: { id: existing.id },
      data: { hours: cappedHours, rateMultiplier: settings.otRateMultiplier },
    });
  }

  return prisma.overtimeRecord.create({
    data: {
      employeeId: record.employeeId,
      date: dateOnly,
      hours: cappedHours,
      rateMultiplier: settings.otRateMultiplier,
      status: 'PENDING',
    },
  });
}

module.exports = { deriveOvertimeForAttendanceRecord };
