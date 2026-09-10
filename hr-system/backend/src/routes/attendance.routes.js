const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const { authenticate, authorize } = require('../middleware/auth');
const { canAccessEmployee, getTeamEmployeeIds } = require('../services/orgScope');
const { syncFromDevice, recalculateOne, toDateOnly, buildMonthlySheetForEmployee } = require('../services/attendanceService');
const { pingDevice } = require('../services/zktecoClient');
const { deriveOvertimeForAttendanceRecord } = require('../services/overtimeService');
const { getSettings } = require('../services/settingsService');

const router = express.Router();
router.use(authenticate);

router.get('/me', async (req, res) => {
  if (!req.user.employeeId) throw new AppError(404, 'No employee record linked to this account');
  const { month, year } = z.object({ month: z.coerce.number().min(1).max(12), year: z.coerce.number() }).parse(req.query);
  res.json(await buildMonthlySheetForEmployee(req.user.employeeId, month, year));
});

router.get('/', async (req, res) => {
  const { employeeId, from, to } = z
    .object({ employeeId: z.string(), from: z.coerce.date(), to: z.coerce.date() })
    .parse(req.query);

  if (!(await canAccessEmployee(req.user, employeeId))) {
    throw new AppError(403, 'You do not have permission to view this employee\'s attendance');
  }

  const records = await prisma.attendanceRecord.findMany({
    where: { employeeId, date: { gte: toDateOnly(from), lte: toDateOnly(to) } },
    orderBy: { date: 'asc' },
  });
  res.json(records);
});

// Whole-office or per-department monthly sheet, for HR/Management.
router.get('/monthly-sheet', authorize('HR_ADMIN', 'MANAGEMENT', 'MANAGER'), async (req, res) => {
  const { month, year, departmentId } = z
    .object({ month: z.coerce.number().min(1).max(12), year: z.coerce.number(), departmentId: z.string().optional() })
    .parse(req.query);

  let where = { employmentStatus: 'ACTIVE' };
  if (req.user.role === 'MANAGER') {
    const teamIds = await getTeamEmployeeIds(req.user.employeeId);
    where.id = { in: teamIds };
  } else if (departmentId) {
    where.departmentId = departmentId;
  }

  const employees = await prisma.employee.findMany({
    where,
    select: { id: true, employeeCode: true, firstName: true, lastName: true, department: { select: { name: true } } },
  });

  const sheet = [];
  for (const employee of employees) {
    sheet.push({ employee, days: await buildMonthlySheetForEmployee(employee.id, month, year) });
  }
  res.json(sheet);
});

const manualSchema = z.object({
  employeeId: z.string(),
  date: z.coerce.date(),
  checkIn: z.coerce.date().optional().nullable(),
  checkOut: z.coerce.date().optional().nullable(),
  status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WEEKEND']),
  note: z.string().min(1, 'A note is required for manual attendance corrections'),
});

router.post('/manual', authorize('HR_ADMIN'), async (req, res) => {
  const { employeeId, date, checkIn, checkOut, status, note } = manualSchema.parse(req.body);
  const dateOnly = toDateOnly(date);

  const record = await prisma.attendanceRecord.upsert({
    where: { employeeId_date: { employeeId, date: dateOnly } },
    create: { employeeId, date: dateOnly, checkIn, checkOut, status, note, isManualEntry: true, createdById: req.user.id },
    update: { checkIn, checkOut, status, note, isManualEntry: true, createdById: req.user.id },
  });
  await deriveOvertimeForAttendanceRecord(record, await getSettings());
  res.json(record);
});

router.put('/:id', authorize('HR_ADMIN'), async (req, res) => {
  const { checkIn, checkOut, status, note } = manualSchema.omit({ employeeId: true, date: true }).parse(req.body);
  const record = await prisma.attendanceRecord.update({
    where: { id: req.params.id },
    data: { checkIn, checkOut, status, note, isManualEntry: true, createdById: req.user.id },
  });
  await deriveOvertimeForAttendanceRecord(record, await getSettings());
  res.json(record);
});

router.post('/sync', authorize('HR_ADMIN'), async (req, res) => {
  const result = await syncFromDevice();
  res.json(result);
});

router.get('/device-status', authorize('HR_ADMIN'), async (req, res) => {
  res.json(await pingDevice());
});

module.exports = router;
