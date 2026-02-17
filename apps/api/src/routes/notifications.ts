import { Router, Request, Response } from 'express';
import { registerPushTokenSchema, updatePreferencesSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * POST /push/register
 * Register push notification token
 */
router.post('/register', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = registerPushTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { token, platform } = parsed.data;

    // Upsert push token (avoid duplicates)
    const pushToken = await prisma.pushToken.upsert({
      where: { token },
      update: {
        userId: req.user!.id,
        platform,
      },
      create: {
        userId: req.user!.id,
        token,
        platform,
      },
    });

    res.json({ data: pushToken });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

/**
 * GET /push/preferences
 * Get notification preferences
 */
router.get('/preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId: req.user!.id },
    });

    // Return default preferences if none exist
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId: req.user!.id,
        },
      });
    }

    res.json({ data: preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

/**
 * PUT /push/preferences
 * Update notification preferences
 */
router.put('/preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = updatePreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: req.user!.id },
      update: parsed.data,
      create: {
        userId: req.user!.id,
        ...parsed.data,
      },
    });

    res.json({ data: preferences });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
