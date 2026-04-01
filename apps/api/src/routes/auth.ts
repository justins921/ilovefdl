import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { signToken, requireAuth } from '../middleware/auth';
import { sendPasswordResetEmail } from '../utils/email';

const router = Router();

/**
 * POST /auth/register
 * Create a new user account with email and password
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email, password, name } = parsed.data;

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Return generic message to prevent user enumeration
      res.status(409).json({ error: 'Unable to create account with this email' });
      return;
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    // Generate JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

/**
 * POST /auth/login
 * Sign in with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

/**
 * GET /auth/me
 * Get the current authenticated user
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ data: user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * POST /auth/forgot-password
 * Request a password reset email
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email } = parsed.data;

    // Always return 200 to avoid leaking email existence
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.json({ message: 'If an account exists, a reset link has been sent' });
      return;
    }

    // Invalidate any existing unused tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate a secure random token and store its hash
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Create a new password reset token (expires in 1 hour)
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // Send the reset email
    await sendPasswordResetEmail({ to: user.email, token });

    res.json({ message: 'If an account exists, a reset link has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

/**
 * POST /auth/reset-password
 * Reset password using a valid token
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { token, password } = parsed.data;

    // Hash the provided token and look it up
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
    });

    if (!resetToken) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    // Check if the token has already been used
    if (resetToken.usedAt) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    // Check if the token has expired
    if (resetToken.expiresAt < new Date()) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update user's password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
