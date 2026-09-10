const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { todayDateOnly } = require('../utils/dateUtils');

const router = express.Router();
router.use(authenticate, authorize('MANAGEMENT', 'HR_ADMIN'));

router.get('/', async (req, res) => {
  const today = todayDateOnly();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [permanentCount, temporaryCount, activeCount, todayRecords, pendingLeave, payrollRun, otRecords] = await Promise.all([
    prisma.employee.count({ where: { employmentType: 'PERMANENT', employmentStatus: 'ACTIVE' } }),
    prisma.employee.count({ where: { employmentType: 'TEMPORARY', employmentStatus: 'ACTIVE' } }),
    prisma.employee.count({ where: { employmentStatus: 'ACTIVE' } }),
    prisma.attendanceRecord.findMany({ where: { date: today } }),
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.payrollRun.findUnique({
      where: { month_year: { month, year } },
      include: { payslips: true },
    }),
    prisma.overtimeRecord.findMany({
      where: { date: { gte: new Date(Date.UTC(year, month - 1, 1)), lte: now } },
    }),
  ]);

  const presentToday = todayRecords.filter((r) => ['PRESENT', 'LATE', 'HALF_DAY'].includes(r.status)).length;
  const todayAttendancePct = activeCount > 0 ? Math.round((presentToday / activeCount) * 1000) / 10 : 0;

  const monthlyPayrollCost = payrollRun ? payrollRun.payslips.reduce((s, p) => s + p.netPay, 0) : null;

  // OT hours trend: total approved OT hours per day so far this month.
  const otTrendMap = new Map();
  otRecords
    .filter((r) => r.status === 'APPROVED')
    .forEach((r) => {
      const key = r.date.toISOString().slice(0, 10);
      otTrendMap.set(key, (otTrendMap.get(key) || 0) + r.hours);
    });
  const otTrend = [...otTrendMap.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, hours]) => ({ date, hours }));

  res.json({
    headcount: { permanent: permanentCount, temporary: temporaryCount, total: activeCount },
    todayAttendancePct,
    pendingLeaveRequests: pendingLeave,
    monthlyPayrollCost,
    payrollRunStatus: payrollRun ? payrollRun.status : null,
    otTrend,
  });
});

module.exports = router;
