const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const { authenticate, authorize } = require('../middleware/auth');
const { canAccessEmployee, getTeamEmployeeIds } = require('../services/orgScope');
const { uploadPhoto, uploadDocument, publicUrl } = require('../middleware/upload');

const router = express.Router();
router.use(authenticate);

const listSelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
  employmentType: true,
  employmentStatus: true,
  phone: true,
  email: true,
  joiningDate: true,
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, title: true } },
  managerId: true,
  hasSelfServiceAccess: true,
};

const detailInclude = {
  department: true,
  designation: true,
  manager: { select: { id: true, firstName: true, lastName: true } },
  documents: true,
  salaryStructure: { include: { allowances: { include: { allowanceType: true } } } },
  user: { select: { id: true, email: true, role: true, isActive: true } },
};

// GET /api/employees - directory/search. HR_ADMIN & MANAGEMENT see everyone;
// MANAGER sees their direct reports; EMPLOYEE gets 403 (use /employees/me).
router.get('/', async (req, res) => {
  const { q, departmentId, designationId, employmentType, employmentStatus } = req.query;

  let scopeWhere = {};
  if (req.user.role === 'MANAGER') {
    const teamIds = await getTeamEmployeeIds(req.user.employeeId);
    scopeWhere = { id: { in: [...teamIds, req.user.employeeId] } };
  } else if (req.user.role === 'EMPLOYEE') {
    throw new AppError(403, 'Use /api/employees/me for your own profile');
  }

  const where = {
    ...scopeWhere,
    ...(departmentId && { departmentId }),
    ...(designationId && { designationId }),
    ...(employmentType && { employmentType }),
    ...(employmentStatus && { employmentStatus }),
    ...(q && {
      OR: [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { employeeCode: { contains: q, mode: 'insensitive' } },
      ],
    }),
  };

  const employees = await prisma.employee.findMany({
    where,
    select: listSelect,
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });
  res.json(employees);
});

router.get('/me', async (req, res) => {
  if (!req.user.employeeId) throw new AppError(404, 'No employee record linked to this account');
  const employee = await prisma.employee.findUnique({
    where: { id: req.user.employeeId },
    include: detailInclude,
  });
  res.json(employee);
});

router.get('/:id', async (req, res) => {
  if (!(await canAccessEmployee(req.user, req.params.id))) {
    throw new AppError(403, 'You do not have permission to view this employee');
  }
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id }, include: detailInclude });
  if (!employee) throw new AppError(404, 'Employee not found');
  res.json(employee);
});

const employeeSchema = z.object({
  employeeCode: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  nid: z.string().optional(),
  joiningDate: z.coerce.date(),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  employmentType: z.enum(['PERMANENT', 'TEMPORARY']),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE', 'RESIGNED', 'TERMINATED']).optional(),
  managerId: z.string().optional(),
  hasSelfServiceAccess: z.boolean().optional(),
});

router.post('/', authorize('HR_ADMIN'), async (req, res) => {
  const data = employeeSchema.parse(req.body);
  const employee = await prisma.employee.create({ data: { ...data, email: data.email || null } });
  res.status(201).json(employee);
});

router.put('/:id', authorize('HR_ADMIN'), async (req, res) => {
  const data = employeeSchema.partial().parse(req.body);
  const employee = await prisma.employee.update({
    where: { id: req.params.id },
    data: { ...data, email: data.email === '' ? null : data.email },
  });
  res.json(employee);
});

router.delete('/:id', authorize('HR_ADMIN'), async (req, res) => {
  await prisma.employee.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

router.post('/:id/photo', authorize('HR_ADMIN'), uploadPhoto.single('photo'), async (req, res) => {
  if (!req.file) throw new AppError(400, 'No file uploaded');
  const employee = await prisma.employee.update({
    where: { id: req.params.id },
    data: { photoUrl: publicUrl(req.file.path) },
  });
  res.json(employee);
});

router.post('/:id/documents', authorize('HR_ADMIN'), uploadDocument.single('document'), async (req, res) => {
  if (!req.file) throw new AppError(400, 'No file uploaded');
  const type = req.body.type || 'OTHER';
  const document = await prisma.document.create({
    data: { employeeId: req.params.id, type, fileUrl: publicUrl(req.file.path) },
  });
  res.status(201).json(document);
});

router.delete('/:id/documents/:docId', authorize('HR_ADMIN'), async (req, res) => {
  await prisma.document.delete({ where: { id: req.params.docId } });
  res.status(204).end();
});

// ---- Self-service account provisioning ----
// Temporary employees are tracked but don't get a login by default; HR can
// flip hasSelfServiceAccess on a per-employee basis and provision one here.
const accountSchema = z.object({
  email: z.string().email(),
  role: z.enum(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'MANAGEMENT']).default('EMPLOYEE'),
});

router.post('/:id/account', authorize('HR_ADMIN'), async (req, res) => {
  const { email, role } = accountSchema.parse(req.body);
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) throw new AppError(404, 'Employee not found');
  if (employee.userId) throw new AppError(409, 'This employee already has an account');

  const tempPassword = crypto.randomBytes(6).toString('base64url');
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({ data: { email, passwordHash, role } });
  await prisma.employee.update({
    where: { id: employee.id },
    data: { userId: user.id, hasSelfServiceAccess: true },
  });

  res.status(201).json({ userId: user.id, email, tempPassword });
});

router.put('/:id/account', authorize('HR_ADMIN'), async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee || !employee.userId) throw new AppError(404, 'This employee has no account');

  const data = z.object({
    role: z.enum(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'MANAGEMENT']).optional(),
    isActive: z.boolean().optional(),
  }).parse(req.body);

  const user = await prisma.user.update({ where: { id: employee.userId }, data });
  res.json({ id: user.id, email: user.email, role: user.role, isActive: user.isActive });
});

router.post('/:id/account/reset-password', authorize('HR_ADMIN'), async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee || !employee.userId) throw new AppError(404, 'This employee has no account');

  const tempPassword = crypto.randomBytes(6).toString('base64url');
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.user.update({ where: { id: employee.userId }, data: { passwordHash } });

  res.json({ tempPassword });
});

module.exports = router;
