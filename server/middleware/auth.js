import jwt from 'jsonwebtoken';

import User from '../models/User.js';

export const COOKIE_NAME = 'safety_token';
const DAYS = 7;

// The server refuses to start without a real secret, so a deploy can never
// silently sign tokens with a guessable default.
export function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to at least 32 characters. See server/.env.example.');
  }
  return secret;
}

export function issueToken(res, user) {
  const token = jwt.sign({ sub: user._id.toString() }, jwtSecret(), { expiresIn: `${DAYS}d` });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,          // JavaScript on the page can never read it
    sameSite: 'lax',         // survives ordinary navigation, blocks cross-site POSTs
    secure: process.env.NODE_ENV === 'production',
    maxAge: DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearToken(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// Attaches req.user when a valid cookie is present, and says nothing when it
// is not. Used by routes that work either way.
export async function optionalAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();

  try {
    const { sub } = jwt.verify(token, jwtSecret());
    req.user = await User.findById(sub);
  } catch {
    // An expired or tampered token is treated as simply not being signed in.
    clearToken(res);
  }

  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Log in to do that' });
  next();
}
