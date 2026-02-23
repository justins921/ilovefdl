import { Router, Request, Response } from 'express';

const router = Router();

interface ShippingRate {
  carrier: string;
  service: string;
  rate: number;
  estimatedDays: string;
}

// POST /shipping-rates/rates — calculate shipping rates based on weight
router.post('/rates', (req: Request, res: Response) => {
  try {
    const { vendorId, weight, destination } = req.body;

    if (!vendorId || !weight || !destination) {
      res.status(400).json({ error: 'vendorId, weight, and destination are required' });
      return;
    }

    if (typeof weight !== 'number' || weight <= 0) {
      res.status(400).json({ error: 'weight must be a positive number (in ounces)' });
      return;
    }

    if (!destination.state || !destination.postalCode || !destination.country) {
      res.status(400).json({ error: 'destination must include state, postalCode, and country' });
      return;
    }

    let rates: ShippingRate[];

    if (weight <= 16) {
      rates = [
        { carrier: 'USPS', service: 'First Class', rate: 4.99, estimatedDays: '3-5' },
        { carrier: 'USPS', service: 'Priority', rate: 8.99, estimatedDays: '1-3' },
      ];
    } else if (weight <= 80) {
      rates = [
        { carrier: 'USPS', service: 'Priority', rate: 12.99, estimatedDays: '1-3' },
        { carrier: 'UPS', service: 'Ground', rate: 9.99, estimatedDays: '3-7' },
        { carrier: 'FedEx', service: 'Ground', rate: 10.99, estimatedDays: '3-5' },
      ];
    } else {
      rates = [
        { carrier: 'UPS', service: 'Ground', rate: 15.99, estimatedDays: '3-7' },
        { carrier: 'FedEx', service: 'Ground', rate: 17.99, estimatedDays: '3-5' },
        { carrier: 'FedEx', service: 'Express', rate: 29.99, estimatedDays: '1-2' },
      ];
    }

    res.json({ data: rates });
  } catch (error) {
    console.error('Shipping rates error:', error);
    res.status(500).json({ error: 'Failed to calculate shipping rates' });
  }
});

export default router;
