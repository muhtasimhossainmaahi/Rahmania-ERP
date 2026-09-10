const express = require('express');
const path = require('path');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const { authenticate, authorize } = require('../middleware/auth');
const { canAccessEmployee } = require('../services/orgScope');
const { calculateRun } = require('../services/payrollService');
const { generatePayslipPdf } = require('../services/pdfService');
const { UPLOAD_ROOT } = require('../middleware/upload');

const router = express.Router();
router.use(authenticate);

// ---- Salary structure ----
router.get('/salary-structure/:employeeId', authorize('HR_ADMIN', 'MANAGEMENT'), async (req, res) => {
  const structure = await prisma.salaryStructure.findUnique({
    where: { employeeId: req.params.employeeId },
    include: { allowances: { include: { allowanceType: true } } },
  });
  res.json(structure);
});

const salaryStructureSchema = z.object({
  basicSalary: z.number().min(0),
  allowances: z.array(z.object({ allowanceTypeId: z.string(), amount: z.number().min(0) })).default([]),
});

router.put('/salary-structure/:employeeId', authorize('HR_ADMIN'), async (req, res) => {
  const { basicSalary, allowances } = salaryStructureSchema.parse(req.body);
  const employeeId = req.params.employeeId;

  const structure = await prisma.salaryStructure.upsert({
    where: { employeeId },
    create: { employeeId, basicSalary },
    update: { basicSalary },
  });

  await prisma.salaryAllowance.deleteMany({ where: { salaryStructureId: structure.id } });
  if (allowances.length > 0) {
    await prisma.salaryAllowance.createMany({
      data: allowances.map((a) => ({ salaryStructureId: structure.id, allowanceTypeId: a.allowanceTypeId, amount: a.amount })),
    });
  }

  const result = await prisma.salaryStructure.findUnique({
    where: { id: structure.id },
    include: { allowances: { include: { allowanceType: true } } },
  });
  res.json(result);
});

// ---- Payroll runs ----
router.get('/runs', authorize('HR_ADMIN', 'MANAGEMENT'), async (req, res) => {
  const runs = await prisma.payrollRun.findMany({ orderBy: [{ year: 'desc' }, { month: 'desc' }] });
  res.json(runs);
});

router.get('/runs/:id', authorize('HR_ADMIN', 'MANAGEMENT'), async (req, res) => {
  const run = await prisma.payrollRun.findUnique({
    where: { id: req.params.id },
    include: {
      payslips: {
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } } },
        orderBy: { employee: { firstName: 'asc' } },
      },
    },
  });
  if (!run) throw new AppError(404, 'Payroll run not found');
  res.json(run);
});

router.post('/runs/calculate', authorize('HR_ADMIN'), async (req, res) => {
  const { month, year } = z.object({ month: z.number().min(1).max(12), year: z.number() }).parse(req.body);
  const run = await calculateRun(month, year, req.user.id);
  res.json(run);
});

const deductionSchema = z.object({ employeeId: z.string(), amount: z.number().positive(), reason: z.string().min(1) });

router.post('/runs/:id/deductions', authorize('HR_ADMIN'), async (req, res) => {
  const run = await prisma.payrollRun.findUnique({ where: { id: req.params.id } });
  if (!run) throw new AppError(404, 'Payroll run not found');
  if (run.status !== 'DRAFT') throw new AppError(400, 'Deductions can only be added to a DRAFT run');

  const { employeeId, amount, reason } = deductionSchema.parse(req.body);
  await prisma.manualDeduction.create({ data: { employeeId, payrollRunId: run.id, amount, reason } });

  const updated = await calculateRun(run.month, run.year, req.user.id);
  res.status(201).json(updated);
});

router.put('/runs/:id/review', authorize('HR_ADMIN'), async (req, res) => {
  const run = await prisma.payrollRun.findUnique({ where: { id: req.params.id } });
  if (!run) throw new AppError(404, 'Payroll run not found');
  if (run.status !== 'DRAFT') throw new AppError(400, 'Only a DRAFT run can be marked reviewed');

  const updated = await prisma.payrollRun.update({
    where: { id: run.id },
    data: { status: 'REVIEWED', reviewedById: req.user.id },
  });
  res.json(updated);
});

router.put('/runs/:id/finalize', authorize('HR_ADMIN'), async (req, res) => {
  const run = await prisma.payrollRun.findUnique({
    where: { id: req.params.id },
    include: { payslips: { include: { employee: { include: { department: true, designation: true } } } } },
  });
  if (!run) throw new AppError(404, 'Payroll run not found');
  if (run.status !== 'REVIEWED') throw new AppError(400, 'Only a REVIEWED run can be finalized');

  for (const payslip of run.payslips) {
    const { publicPath } = generatePayslipPdf(payslip, payslip.employee, run);
    await prisma.payslip.update({ where: { id: payslip.id }, data: { pdfPath: publicPath } });
  }

  const updated = await prisma.payrollRun.update({
    where: { id: run.id },
    data: { status: 'FINALIZED', finalizedAt: new Date() },
  });
  res.json(updated);
});

// ---- Payslips (employee-facing) ----
router.get('/payslips', async (req, res) => {
  const { employeeId } = z.object({ employeeId: z.string().optional() }).parse(req.query);
  const targetId = employeeId || req.user.employeeId;
  if (!targetId) throw new AppError(400, 'employeeId is required');
  if (!(await canAccessEmployee(req.user, targetId))) throw new AppError(403, 'Not permitted');

  const payslips = await prisma.payslip.findMany({
    where: { employeeId: targetId, payrollRun: { status: 'FINALIZED' } },
    include: { payrollRun: true },
    orderBy: [{ payrollRun: { year: 'desc' } }, { payrollRun: { month: 'desc' } }],
  });
  res.json(payslips);
});

router.get('/payslips/:id/pdf', async (req, res) => {
  const payslip = await prisma.payslip.findUnique({ where: { id: req.params.id }, include: { payrollRun: true } });
  if (!payslip || payslip.payrollRun.status !== 'FINALIZED' || !payslip.pdfPath) {
    throw new AppError(404, 'Payslip PDF not available');
  }
  if (!(await canAccessEmployee(req.user, payslip.employeeId))) throw new AppError(403, 'Not permitted');

  const absolutePath = path.join(UPLOAD_ROOT, payslip.pdfPath.replace('/uploads/', ''));
  res.download(absolutePath, `payslip-${payslip.payrollRun.year}-${payslip.payrollRun.month}.pdf`);
});

module.exports = router;
