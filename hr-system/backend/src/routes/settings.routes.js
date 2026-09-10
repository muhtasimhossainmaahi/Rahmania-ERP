const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { getSettings, updateSettings } = require('../services/settingsService');

const router = express.Router();
router.use(authenticate);

// Any logged-in user can read settings (needed to render shift/leave info
// in self-service screens); only HR/Admin can change them.
router.get('/', async (req, res) => {
  res.json(await getSettings());
});

const settingsSchema = z.object({
  weeklyHolidays: z.array(z.number().int().min(0).max(6)).optional(),
  shiftStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  shiftEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  gracePeriodMinutes: z.number().int().min(0).optional(),
  halfDayThresholdHrs: z.number().min(0).optional(),
  otRateMultiplier: z.number().min(0).optional(),
  otDailyCapHours: z.number().min(0).optional(),
  otMonthlyCapHours: z.number().min(0).optional(),
  attendanceSyncIntervalMinutes: z.number().int().min(1).optional(),
});

router.put('/', authorize('HR_ADMIN'), async (req, res) => {
  const data = settingsSchema.parse(req.body);
  res.json(await updateSettings(data));
});

// ---- Leave types ----
router.get('/leave-types', async (req, res) => {
  res.json(await prisma.leaveType.findMany({ orderBy: { name: 'asc' } }));
});

const leaveTypeSchema = z.object({
  name: z.string().min(1),
  entitlementPermanent: z.number().int().min(0).default(0),
  entitlementTemporary: z.number().int().min(0).default(0),
  requiresApproval: z.boolean().default(true),
});

router.post('/leave-types', authorize('HR_ADMIN'), async (req, res) => {
  const data = leaveTypeSchema.parse(req.body);
  res.status(201).json(await prisma.leaveType.create({ data }));
});

router.put('/leave-types/:id', authorize('HR_ADMIN'), async (req, res) => {
  const data = leaveTypeSchema.partial().parse(req.body);
  res.json(await prisma.leaveType.update({ where: { id: req.params.id }, data }));
});

router.delete('/leave-types/:id', authorize('HR_ADMIN'), async (req, res) => {
  await prisma.leaveType.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// ---- Allowance types ----
router.get('/allowance-types', async (req, res) => {
  res.json(await prisma.allowanceType.findMany({ orderBy: { name: 'asc' } }));
});

router.post('/allowance-types', authorize('HR_ADMIN'), async (req, res) => {
  const data = z.object({ name: z.string().min(1) }).parse(req.body);
  res.status(201).json(await prisma.allowanceType.create({ data }));
});

router.put('/allowance-types/:id', authorize('HR_ADMIN'), async (req, res) => {
  const data = z.object({ name: z.string().min(1) }).parse(req.body);
  res.json(await prisma.allowanceType.update({ where: { id: req.params.id }, data }));
});

router.delete('/allowance-types/:id', authorize('HR_ADMIN'), async (req, res) => {
  await prisma.allowanceType.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// ---- Company holiday calendar ----
router.get('/holidays', async (req, res) => {
  const year = req.query.year ? Number(req.query.year) : undefined;
  res.json(await prisma.holiday.findMany({ where: year ? { year } : {}, orderBy: { date: 'asc' } }));
});

const holidaySchema = z.object({
  date: z.coerce.date(),
  name: z.string().min(1),
});

router.post('/holidays', authorize('HR_ADMIN'), async (req, res) => {
  const { date, name } = holidaySchema.parse(req.body);
  res.status(201).json(await prisma.holiday.create({ data: { date, name, year: date.getFullYear() } }));
});

router.delete('/holidays/:id', authorize('HR_ADMIN'), async (req, res) => {
  await prisma.holiday.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

module.exports = router;
