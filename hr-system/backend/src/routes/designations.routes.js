const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  res.json(await prisma.designation.findMany({ orderBy: { title: 'asc' } }));
});

router.post('/', authorize('HR_ADMIN'), async (req, res) => {
  const data = z.object({ title: z.string().min(1) }).parse(req.body);
  res.status(201).json(await prisma.designation.create({ data }));
});

router.put('/:id', authorize('HR_ADMIN'), async (req, res) => {
  const data = z.object({ title: z.string().min(1) }).parse(req.body);
  res.json(await prisma.designation.update({ where: { id: req.params.id }, data }));
});

router.delete('/:id', authorize('HR_ADMIN'), async (req, res) => {
  await prisma.designation.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

module.exports = router;
