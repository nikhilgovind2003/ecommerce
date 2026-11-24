// Limits how many requests one client can send. The limits come from .env.
import rateLimit from 'express-rate-limit';
import AppError from '../utils/appError.js';

function num(value, fallback) { return Number(value) || fallback; }
function windowMs() { return num(process.env.RATE_LIMIT_WINDOW_MINUTES, 15) * 60 * 1000; }

function build(limit) {
  return rateLimit({
    windowMs: windowMs(),
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: function () {
      return process.env.NODE_ENV === 'test'; // keeps the automated tests deterministic
    },
    handler: function (req, res, next) {
      next(AppError.tooManyRequests());
    },
  });
}

// General protection for the whole API
export const globalLimiter = build(num(process.env.RATE_LIMIT_MAX, 300));

// Much stricter for login/register to slow down password guessing
export const authLimiter = build(num(process.env.AUTH_RATE_LIMIT_MAX, 20));
