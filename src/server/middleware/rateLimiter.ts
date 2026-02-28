import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const rateLimiter = (maxRequests: number = 30, windowMs: number = 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    const entry = store.get(key);

    if (!entry || now > entry.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({
        message: 'Muitas tentativas. Tente novamente em breve.',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      });
    }

    entry.count++;
    next();
  };
};

// Stricter limiter for auth endpoints
export const authRateLimiter = rateLimiter(10, 60 * 1000); // 10 requests per minute
export const paymentRateLimiter = rateLimiter(5, 60 * 1000); // 5 requests per minute
