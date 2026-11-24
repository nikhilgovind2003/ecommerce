// Limits how many requests one client can send. The limits come from .env.
import rateLimit from 'express-rate-limit';
import AppError from '../utils/AppError.js';

const num = (value, fallback) => Number(value) || fallback;
const windowMs = () => num(process.env.RATE_LIMIT_WINDOW_MINUTES, 15) * 60 * 1000;

const build = (limit) =>
  rateLimit({
    windowMs: windowMs(),
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test', // keeps the automated tests deterministic
    handler: (req, res, next) => next(new AppError('Too many requests, please try again later', 429)),
  });

// General protection for the whole API
export const globalLimiter = build(num(process.env.RATE_LIMIT_MAX, 300));

// Much stricter for login/register to slow down password guessing
export const authLimiter = build(num(process.env.AUTH_RATE_LIMIT_MAX, 20));
