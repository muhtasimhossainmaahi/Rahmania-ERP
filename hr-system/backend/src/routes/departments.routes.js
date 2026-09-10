const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  res.json(await prisma.department.findMany({ orderBy: { name: 'asc' } }));
});

router.post('/', authorize('HR_ADMIN'), async (req, res) => {
  const data = z.object({ name: z.string().min(1) }).parse(req.body);
  res.status(201).json(await prisma.department.create({ data }));
});

router.put('/:id', authorize('HR_ADMIN'), async (req, res) => {
  const data = z.object({ name: z.string().min(1) }).parse(req.body);
  res.json(await prisma.department.update({ where: { id: req.params.id }, data }));
});

router.delete('/:id', authorize('HR_ADMIN'), async (req, res) => {
  await prisma.department.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

module.exports = router;
