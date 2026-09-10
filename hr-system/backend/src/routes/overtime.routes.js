const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const { authenticate, authorize } = require('../middleware/auth');
const { canAccessEmployee, getTeamEmployeeIds } = require('../services/orgScope');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { employeeId, status, month, year } = z
    .object({
      employeeId: z.string().optional(),
      status: z.string().optional(),
      month: z.coerce.number().min(1).max(12).optional(),
      year: z.coerce.number().optional(),
    })
    .parse(req.query);

  let where = {};
  if (employeeId) {
    if (!(await canAccessEmployee(req.user, employeeId))) throw new AppError(403, 'Not permitted');
    where.employeeId = employeeId;
  } else if (req.user.role === 'MANAGER') {
    const teamIds = await getTeamEmployeeIds(req.user.employeeId);
    where.employeeId = { in: [...teamIds, req.user.employeeId] };
  } else if (req.user.role === 'EMPLOYEE') {
    where.employeeId = req.user.employeeId;
  }
  if (status) where.status = status;
  if (month && year) {
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 0));
    where.date = { gte: from, lte: to };
  }

  const records = await prisma.overtimeRecord.findMany({
    where,
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } } },
    orderBy: { date: 'desc' },
  });
  res.json(records);
});

const decisionSchema = z.object({ status: z.enum(['APPROVED', 'REJECTED']) });

router.put('/:id/decision', authorize('MANAGER', 'HR_ADMIN', 'MANAGEMENT'), async (req, res) => {
  const { status } = decisionSchema.parse(req.body);
  const record = await prisma.overtimeRecord.findUnique({ where: { id: req.params.id } });
  if (!record) throw new AppError(404, 'Overtime record not found');
  if (record.status !== 'PENDING') throw new AppError(400, 'This record has already been decided');

  if (req.user.role === 'MANAGER') {
    const teamIds = await getTeamEmployeeIds(req.user.employeeId);
    if (!teamIds.includes(record.employeeId)) throw new AppError(403, 'You can only decide on your team\'s overtime');
  }

  const updated = await prisma.overtimeRecord.update({
    where: { id: record.id },
    data: { status, approverId: req.user.employeeId, decidedAt: new Date() },
  });
  res.json(updated);
});

// Summary per employee/department for a month - used by the OT report and
// by payroll when pulling approved hours into a run.
router.get('/summary', authorize('HR_ADMIN', 'MANAGEMENT', 'MANAGER'), async (req, res) => {
  const { month, year, departmentId } = z
    .object({ month: z.coerce.number().min(1).max(12), year: z.coerce.number(), departmentId: z.string().optional() })
    .parse(req.query);
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));

  let employeeWhere = { employmentStatus: 'ACTIVE' };
  if (req.user.role === 'MANAGER') {
    const teamIds = await getTeamEmployeeIds(req.user.employeeId);
    employeeWhere.id = { in: teamIds };
  } else if (departmentId) {
    employeeWhere.departmentId = departmentId;
  }

  const employees = await prisma.employee.findMany({
    where: employeeWhere,
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      department: { select: { name: true } },
      overtimeRecords: { where: { date: { gte: from, lte: to } } },
    },
  });

  const summary = employees.map((e) => {
    const approved = e.overtimeRecords.filter((r) => r.status === 'APPROVED');
    const pending = e.overtimeRecords.filter((r) => r.status === 'PENDING');
    return {
      employee: { id: e.id, employeeCode: e.employeeCode, firstName: e.firstName, lastName: e.lastName, department: e.department },
      approvedHours: approved.reduce((s, r) => s + r.hours, 0),
      pendingHours: pending.reduce((s, r) => s + r.hours, 0),
    };
  });

  res.json(summary);
});

module.exports = router;
