import rateLimit from 'express-rate-limit';

// Global: 200 requests per 15 minutes per IP
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// Auth: 5 login attempts per 15 minutes per IP (brute-force prevention)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please wait 15 minutes before trying again.' },
  skipSuccessfulRequests: true,
});

// AI analysis: 10 calls per hour per IP
export const aiRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'AI analysis limit reached. You can analyze 10 incidents per hour.' },
});
