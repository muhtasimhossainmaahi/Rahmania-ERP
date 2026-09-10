const express = require('express');
const ExcelJS = require('exceljs');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { buildMonthlySheetForEmployee } = require('../services/attendanceService');
const { sendWorkbook } = require('../services/excelService');
const { daysInMonth } = require('../utils/dateUtils');
const AppError = require('../utils/AppError');

const router = express.Router();
router.use(authenticate, authorize('HR_ADMIN', 'MANAGEMENT'));

const monthYearQuery = z.object({ month: z.coerce.number().min(1).max(12), year: z.coerce.number(), departmentId: z.string().optional() });

router.get('/attendance-register', async (req, res) => {
  const { month, year, departmentId } = monthYearQuery.parse(req.query);
  const total = daysInMonth(year, month);

  const employees = await prisma.employee.findMany({
    where: { employmentStatus: 'ACTIVE', ...(departmentId && { departmentId }) },
    select: { id: true, employeeCode: true, firstName: true, lastName: true, department: { select: { name: true } } },
    orderBy: [{ firstName: 'asc' }],
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Attendance Register');
  const STATUS_ABBR = { PRESENT: 'P', LATE: 'L', ABSENT: 'A', HALF_DAY: 'H', LEAVE: 'LV', HOLIDAY: 'HO', WEEKEND: 'W' };

  const header = ['Code', 'Name', 'Department', ...Array.from({ length: total }, (_, i) => String(i + 1)), 'Present', 'Late', 'Absent', 'Half-day', 'Leave'];
  sheet.addRow(header).font = { bold: true };

  for (const employee of employees) {
    const days = await buildMonthlySheetForEmployee(employee.id, month, year);
    const byDay = new Map(days.map((d) => [new Date(d.date).getUTCDate(), d.status]));
    const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, HALF_DAY: 0, LEAVE: 0 };
    const cells = [];
    for (let d = 1; d <= total; d += 1) {
      const status = byDay.get(d);
      cells.push(status ? STATUS_ABBR[status] || status : '');
      if (status && counts[status] !== undefined) counts[status] += 1;
    }
    sheet.addRow([
      employee.employeeCode,
      `${employee.firstName} ${employee.lastName}`,
      employee.department?.name || '',
      ...cells,
      counts.PRESENT,
      counts.LATE,
      counts.ABSENT,
      counts.HALF_DAY,
      counts.LEAVE,
    ]);
  }

  sheet.columns.forEach((c) => { c.width = 10; });
  await sendWorkbook(res, workbook, `attendance-register-${year}-${month}.xlsx`);
});

router.get('/leave-report', async (req, res) => {
  const { year } = z.object({ year: z.coerce.number() }).parse(req.query);

  const requests = await prisma.leaveRequest.findMany({
    where: { startDate: { gte: new Date(Date.UTC(year, 0, 1)) }, endDate: { lte: new Date(Date.UTC(year, 11, 31)) } },
    include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } }, leaveType: true },
    orderBy: { startDate: 'asc' },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Leave Report');
  sheet.addRow(['Code', 'Name', 'Leave Type', 'Start', 'End', 'Days', 'Status', 'Reason']).font = { bold: true };
  requests.forEach((r) => {
    sheet.addRow([
      r.employee.employeeCode,
      `${r.employee.firstName} ${r.employee.lastName}`,
      r.leaveType.name,
      r.startDate.toISOString().slice(0, 10),
      r.endDate.toISOString().slice(0, 10),
      r.days,
      r.status,
      r.reason || '',
    ]);
  });
  sheet.columns.forEach((c) => { c.width = 16; });
  await sendWorkbook(res, workbook, `leave-report-${year}.xlsx`);
});

router.get('/payroll-register', async (req, res) => {
  const { month, year } = monthYearQuery.parse(req.query);
  const run = await prisma.payrollRun.findUnique({
    where: { month_year: { month, year } },
    include: { payslips: { include: { employee: { select: { employeeCode: true, firstName: true, lastName: true, department: { select: { name: true } } } } } } },
  });
  if (!run) throw new AppError(404, 'No payroll run found for that month/year');

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Payroll Register');
  sheet.addRow(['Code', 'Name', 'Department', 'Basic', 'Allowances', 'Gross', 'Unpaid Deduction', 'OT Hours', 'OT Pay', 'Manual Deductions', 'Net Pay']).font = { bold: true };
  run.payslips.forEach((p) => {
    sheet.addRow([
      p.employee.employeeCode,
      `${p.employee.firstName} ${p.employee.lastName}`,
      p.employee.department?.name || '',
      p.basicSalary,
      p.totalAllowances,
      p.grossSalary,
      p.unpaidDeduction,
      p.overtimeHours,
      p.overtimePay,
      p.manualDeductions,
      p.netPay,
    ]);
  });
  sheet.columns.forEach((c) => { c.width = 16; });
  await sendWorkbook(res, workbook, `payroll-register-${year}-${month}.xlsx`);
});

router.get('/overtime-report', async (req, res) => {
  const { month, year } = monthYearQuery.parse(req.query);
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));

  const records = await prisma.overtimeRecord.findMany({
    where: { date: { gte: from, lte: to } },
    include: { employee: { select: { employeeCode: true, firstName: true, lastName: true, department: { select: { name: true } } } } },
    orderBy: { date: 'asc' },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Overtime Report');
  sheet.addRow(['Code', 'Name', 'Department', 'Date', 'Hours', 'Rate Multiplier', 'Status']).font = { bold: true };
  records.forEach((r) => {
    sheet.addRow([
      r.employee.employeeCode,
      `${r.employee.firstName} ${r.employee.lastName}`,
      r.employee.department?.name || '',
      r.date.toISOString().slice(0, 10),
      r.hours,
      r.rateMultiplier,
      r.status,
    ]);
  });
  sheet.columns.forEach((c) => { c.width = 16; });
  await sendWorkbook(res, workbook, `overtime-report-${year}-${month}.xlsx`);
});

module.exports = router;
