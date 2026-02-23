import { Router, Request, Response } from 'express';
import { convertCurrencySchema } from '@ilovefdl/shared';

const router = Router();

const EXCHANGE_RATES: Record<string, { name: string; symbol: string; rate: number }> = {
  USD: { name: 'US Dollar', symbol: '$', rate: 1.0 },
  EUR: { name: 'Euro', symbol: '\u20ac', rate: 0.92 },
  GBP: { name: 'British Pound', symbol: '\u00a3', rate: 0.79 },
  CAD: { name: 'Canadian Dollar', symbol: 'C$', rate: 1.36 },
  AUD: { name: 'Australian Dollar', symbol: 'A$', rate: 1.53 },
};

// GET /currency — return supported currencies with exchange rates
router.get('/', (_req: Request, res: Response) => {
  res.json({ data: EXCHANGE_RATES });
});

// POST /currency/convert — convert amount between currencies
router.post('/convert', (req: Request, res: Response) => {
  try {
    const parsed = convertCurrencySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const { amount, from, to } = parsed.data;

    const fromRate = EXCHANGE_RATES[from];
    const toRate = EXCHANGE_RATES[to];

    if (!fromRate || !toRate) {
      res.status(400).json({ error: 'Unsupported currency' });
      return;
    }

    // Convert: amount in "from" -> USD -> "to"
    const amountInUsd = amount / fromRate.rate;
    const convertedAmount = Math.round(amountInUsd * toRate.rate * 100) / 100;
    const conversionRate = Math.round((toRate.rate / fromRate.rate) * 10000) / 10000;

    res.json({
      data: {
        amount: convertedAmount,
        rate: conversionRate,
      },
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({ error: 'Failed to convert currency' });
  }
});

export default router;
