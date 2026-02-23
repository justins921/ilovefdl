import { Router, Request, Response } from 'express';
import { calculateTaxSchema, createTaxRateSchema, updateTaxRateSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// POST /tax/calculate — calculate tax for a given subtotal (public)
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const parsed = calculateTaxSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const { subtotal, state, country } = parsed.data;

    const taxRate = await prisma.taxRate.findFirst({
      where: { country, state, isActive: true },
    });

    if (!taxRate) {
      res.json({ data: { tax: 0, rate: 0, name: 'No tax' } }); return;
    }

    const tax = Math.round(subtotal * taxRate.rate * 100) / 100;

    res.json({ data: { tax, rate: taxRate.rate, name: taxRate.name } });
  } catch (error) {
    console.error('Calculate tax error:', error);
    res.status(500).json({ error: 'Failed to calculate tax' });
  }
});

// GET /tax — list all tax rates (admin)
router.get('/', requireAuth, requireRole(['ADMIN']), async (_req: Request, res: Response) => {
  try {
    const taxRates = await prisma.taxRate.findMany({
      orderBy: [{ country: 'asc' }, { state: 'asc' }],
    });

    res.json({ data: taxRates });
  } catch (error) {
    console.error('List tax rates error:', error);
    res.status(500).json({ error: 'Failed to fetch tax rates' });
  }
});

// POST /tax — create a tax rate (admin)
router.post('/', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const parsed = createTaxRateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const taxRate = await prisma.taxRate.create({
      data: parsed.data,
    });

    res.status(201).json({ data: taxRate });
  } catch (error) {
    console.error('Create tax rate error:', error);
    res.status(500).json({ error: 'Failed to create tax rate' });
  }
});

// PUT /tax/:id — update a tax rate (admin)
router.put('/:id', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const parsed = updateTaxRateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const existing = await prisma.taxRate.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ error: 'Tax rate not found' }); return; }

    const taxRate = await prisma.taxRate.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    res.json({ data: taxRate });
  } catch (error) {
    console.error('Update tax rate error:', error);
    res.status(500).json({ error: 'Failed to update tax rate' });
  }
});

// DELETE /tax/:id — delete a tax rate (admin)
router.delete('/:id', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.taxRate.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ error: 'Tax rate not found' }); return; }

    await prisma.taxRate.delete({ where: { id: req.params.id } });

    res.json({ data: { message: 'Tax rate deleted' } });
  } catch (error) {
    console.error('Delete tax rate error:', error);
    res.status(500).json({ error: 'Failed to delete tax rate' });
  }
});

export default router;
