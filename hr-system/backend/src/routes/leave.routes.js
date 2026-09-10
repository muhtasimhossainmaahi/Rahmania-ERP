const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const { authenticate, authorize } = require('../middleware/auth');
const { canAccessEmployee, getTeamEmployeeIds } = require('../services/orgScope');
const { computeLeaveDays, getOrCreateBalance, applyApprovedLeave } = require('../services/leaveService');
const { toDateOnly } = require('../utils/dateUtils');

const router = express.Router();
router.use(authenticate);

router.get('/balances', async (req, res) => {
  const { employeeId, year } = z
    .object({ employeeId: z.string().optional(), year: z.coerce.number().default(new Date().getFullYear()) })
    .parse(req.query);
  const targetId = employeeId || req.user.employeeId;
  if (!targetId) throw new AppError(400, 'employeeId is required');
  if (!(await canAccessEmployee(req.user, targetId))) throw new AppError(403, 'Not permitted');

  const leaveTypes = await prisma.leaveType.findMany();
  const balances = await Promise.all(
    leaveTypes.map(async (lt) => {
      const balance = await getOrCreateBalance(targetId, lt.id, year);
      return {
        leaveType: lt,
        entitlement: balance.entitlement,
        taken: balance.taken,
        remaining: balance.entitlement - balance.taken,
      };
    }),
  );
  res.json(balances);
});

router.get('/requests', async (req, res) => {
  const { employeeId, status } = z.object({ employeeId: z.string().optional(), status: z.string().optional() }).parse(req.query);

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

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: {
      leaveType: true,
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      approver: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
});

const applySchema = z.object({
  leaveTypeId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().optional(),
  employeeId: z.string().optional(), // HR can file on behalf of an employee
});

router.post('/requests', async (req, res) => {
  const body = applySchema.parse(req.body);
  const employeeId = body.employeeId && req.user.role === 'HR_ADMIN' ? body.employeeId : req.user.employeeId;
  if (!employeeId) throw new AppError(400, 'No employee record linked to this account');
  if (body.endDate < body.startDate) throw new AppError(400, 'endDate must be on or after startDate');

  const leaveType = await prisma.leaveType.findUnique({ where: { id: body.leaveTypeId } });
  if (!leaveType) throw new AppError(404, 'Leave type not found');

  const days = await computeLeaveDays(body.startDate, body.endDate);
  const year = body.startDate.getFullYear();
  const balance = await getOrCreateBalance(employeeId, leaveType.id, year);
  if (balance.entitlement - balance.taken < days) {
    throw new AppError(400, `Insufficient ${leaveType.name} balance: ${balance.entitlement - balance.taken} day(s) remaining`);
  }

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId,
      leaveTypeId: leaveType.id,
      startDate: toDateOnly(body.startDate),
      endDate: toDateOnly(body.endDate),
      days,
      reason: body.reason,
      status: leaveType.requiresApproval ? 'PENDING' : 'APPROVED',
      decidedAt: leaveType.requiresApproval ? null : new Date(),
    },
  });

  if (request.status === 'APPROVED') {
    await applyApprovedLeave(request);
  }

  res.status(201).json(request);
});

const decisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  decisionNote: z.string().optional(),
});

router.put('/requests/:id/decision', authorize('MANAGER', 'HR_ADMIN', 'MANAGEMENT'), async (req, res) => {
  const { status, decisionNote } = decisionSchema.parse(req.body);
  const request = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
  if (!request) throw new AppError(404, 'Leave request not found');
  if (request.status !== 'PENDING') throw new AppError(400, 'This request has already been decided');

  if (req.user.role === 'MANAGER') {
    const teamIds = await getTeamEmployeeIds(req.user.employeeId);
    if (!teamIds.includes(request.employeeId)) throw new AppError(403, 'You can only decide on your team\'s leave requests');
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: request.id },
    data: { status, decisionNote, approverId: req.user.employeeId, decidedAt: new Date() },
  });

  if (status === 'APPROVED') {
    await applyApprovedLeave(updated);
  }

  res.json(updated);
});

router.delete('/requests/:id', async (req, res) => {
  const request = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
  if (!request) throw new AppError(404, 'Leave request not found');
  const isOwner = request.employeeId === req.user.employeeId;
  const isHr = req.user.role === 'HR_ADMIN';
  if (!isOwner && !isHr) throw new AppError(403, 'Not permitted');
  if (request.status !== 'PENDING') throw new AppError(400, 'Only pending requests can be cancelled');

  await prisma.leaveRequest.update({ where: { id: request.id }, data: { status: 'CANCELLED' } });
  res.status(204).end();
});

// Basic leave calendar for a month, scoped like /requests.
router.get('/calendar', authorize('HR_ADMIN', 'MANAGEMENT', 'MANAGER'), async (req, res) => {
  const { month, year } = z.object({ month: z.coerce.number().min(1).max(12), year: z.coerce.number() }).parse(req.query);
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));

  let where = { status: 'APPROVED', startDate: { lte: to }, endDate: { gte: from } };
  if (req.user.role === 'MANAGER') {
    const teamIds = await getTeamEmployeeIds(req.user.employeeId);
    where.employeeId = { in: teamIds };
  }

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: { leaveType: true, employee: { select: { id: true, firstName: true, lastName: true } } },
  });
  res.json(requests);
});

module.exports = router;
