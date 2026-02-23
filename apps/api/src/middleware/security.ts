import { Request, Response, NextFunction } from 'express';

// ─── Rate Limiting ──────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Creates an in-memory rate limiting middleware.
 *
 * @param windowMs  - Time window in milliseconds
 * @param maxRequests - Maximum number of requests allowed within the window
 * @returns Express middleware that enforces the rate limit
 */
export function rateLimit(windowMs: number, maxRequests: number) {
  const clients = new Map<string, RateLimitEntry>();

  // Periodically clean up expired entries every 60 seconds
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of clients) {
      if (now >= entry.resetAt) {
        clients.delete(key);
      }
    }
  }, 60_000);

  // Allow the timer to not prevent process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip =
      req.ip ||
      req.socket.remoteAddress ||
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      'unknown';

    const now = Date.now();
    let entry = clients.get(ip);

    // If no entry exists or the window has expired, create a fresh entry
    if (!entry || now >= entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + windowMs,
      };
      clients.set(ip, entry);
    }

    entry.count++;

    const remaining = Math.max(0, maxRequests - entry.count);
    const resetAtSeconds = Math.ceil(entry.resetAt / 1000);

    // Always set rate limit info headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetAtSeconds.toString());

    if (entry.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    next();
  };
}

// ─── Security Headers ───────────────────────────────────────

/**
 * Middleware that sets common security headers on every response.
 * In production, also sets Strict-Transport-Security (HSTS).
 */
export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Enable XSS filter in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict browser features
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // HSTS - only in production (requires HTTPS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  next();
}

// ─── Pre-configured rate limiters ───────────────────────────

/** General API rate limit: 100 requests per 15 minutes */
export const apiRateLimit = rateLimit(15 * 60 * 1000, 100);

/** Auth endpoints rate limit: 20 requests per 15 minutes */
export const authRateLimit = rateLimit(15 * 60 * 1000, 20);

/** Sensitive operations rate limit: 10 requests per minute */
export const strictRateLimit = rateLimit(60 * 1000, 10);
