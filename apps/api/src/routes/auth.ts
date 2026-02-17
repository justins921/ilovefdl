import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { magicLinkSchema, verifyMagicLinkSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { sendMagicLinkEmail } from '../utils/email';
import { signToken } from '../middleware/auth';

const router = Router();

/**
 * POST /auth/magic-link
 * Send a magic link email to the user
 */
router.post('/magic-link', async (req: Request, res: Response) => {
  try {
    const parsed = magicLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email } = parsed.data;

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email },
      });
    }

    // Generate magic link token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate any existing unused magic links for this user
    await prisma.magicLink.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { expiresAt: new Date() },
    });

    // Create new magic link
    await prisma.magicLink.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Send email
    await sendMagicLinkEmail({ to: email, token });

    res.json({ data: { message: 'Magic link sent to your email' } });
  } catch (error) {
    console.error('Magic link error:', error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

/**
 * POST /auth/verify
 * Verify a magic link token and return JWT + user
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const parsed = verifyMagicLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { token } = parsed.data;

    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!magicLink) {
      res.status(400).json({ error: 'Invalid or expired magic link' });
      return;
    }

    if (magicLink.usedAt) {
      res.status(400).json({ error: 'Magic link has already been used' });
      return;
    }

    if (magicLink.expiresAt < new Date()) {
      res.status(400).json({ error: 'Magic link has expired' });
      return;
    }

    // Mark magic link as used
    await prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    });

    // Generate JWT
    const jwt = signToken({
      userId: magicLink.user.id,
      email: magicLink.user.email,
      role: magicLink.user.role,
    });

    res.json({
      data: {
        token: jwt,
        user: {
          id: magicLink.user.id,
          email: magicLink.user.email,
          name: magicLink.user.name,
          role: magicLink.user.role,
          avatarUrl: magicLink.user.avatarUrl,
        },
      },
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Failed to verify magic link' });
  }
});

export default router;
