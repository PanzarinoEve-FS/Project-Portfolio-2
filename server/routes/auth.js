import express from 'express';
import mongoose from 'mongoose';

import User from '../models/User.js';
import { issueToken, clearToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();

const live = () => mongoose.connection.readyState === 1;
const needsDb = (req, res, next) =>
  live() ? next() : res.status(503).json({ error: 'Database unavailable. Is mongod running?' });

// A handful of failures slows the next attempt down. Enough to make guessing a
// password impractical without adding a dependency.
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const MAX_TRACKED = 5000;

// Keyed by address AND the account being targeted, for two reasons. Signing in
// successfully must not wipe the count for a *different* account the same
// address is guessing at -- otherwise an attacker with an account of their own
// resets the counter at will. And behind a reverse proxy every visitor shares
// one address, so an address-only key would let one attacker lock out everyone.
const keyFor = (req) =>
  `${req.ip}|${String(req.body?.login ?? '').trim().toLowerCase()}`;

// Entries are created only by real failures, and expired ones are dropped when
// the map grows -- without this it keeps one entry per address forever.
function sweep(now) {
  for (const [key, record] of attempts) {
    if (now - record.first >= WINDOW_MS) attempts.delete(key);
  }

  // Backstop for a flood that outpaces expiry: drop the oldest rather than
  // grow without bound.
  if (attempts.size >= MAX_TRACKED) {
    const oldest = [...attempts.entries()].sort((a, b) => a[1].first - b[1].first);
    for (const [key] of oldest.slice(0, attempts.size - MAX_TRACKED + 1)) attempts.delete(key);
  }
}

function throttle(req, res, next) {
  const record = attempts.get(keyFor(req));
  const now = Date.now();

  if (record && now - record.first < WINDOW_MS && record.count >= MAX_ATTEMPTS) {
    const mins = Math.ceil((WINDOW_MS - (now - record.first)) / 60000);
    return res.status(429).json({ error: `Too many attempts. Try again in ${mins} minute(s).` });
  }

  next();
}

function countFailure(req) {
  const now = Date.now();
  const key = keyFor(req);
  const record = attempts.get(key);

  if (record && now - record.first < WINDOW_MS) {
    record.count += 1;
    return;
  }

  if (attempts.size >= MAX_TRACKED) sweep(now);
  attempts.set(key, { first: now, count: 1 });
}

// Only the counter for this exact address+account pair.
const clearFailures = (req) => attempts.delete(keyFor(req));

// POST /api/auth/register -> create an account and sign in
router.post('/register', needsDb, async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body ?? {};

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email and password are all required' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const passwordHash = await User.hashPassword(String(password));
    // Name is optional, so an empty string is stored rather than rejected.
    const user = await User.create({
      username,
      email,
      passwordHash,
      firstName: firstName?.trim() || '',
      lastName: lastName?.trim() || '',
    });

    issueToken(res, user);
    res.status(201).json({ user: user.toJSON() });
  } catch (err) {
    // 11000 is Mongo's duplicate-key error; say which field without
    // confirming anything about accounts the caller does not own.
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern ?? {})[0];
      const label = field === 'email' ? 'email address' : 'username';
      return res.status(409).json({ error: `That ${label} is already taken` });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors)[0].message });
    }
    console.error('register failed:', err.message);
    res.status(500).json({ error: 'Could not create the account' });
  }
});

// POST /api/auth/login -> username or email, plus password
router.post('/login', needsDb, throttle, async (req, res) => {
  const { login, password } = req.body ?? {};

  if (!login || !password) {
    return res.status(400).json({ error: 'Enter your username (or email) and password' });
  }

  const key = String(login).trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ usernameLower: key }, { email: key }],
  }).select('+passwordHash');

  // One message for both cases, so this cannot be used to discover which
  // usernames exist.
  const ok = user && (await user.checkPassword(String(password)));
  if (!ok) {
    countFailure(req);
    return res.status(401).json({ error: 'That username or password is not right' });
  }

  clearFailures(req);
  issueToken(res, user);
  res.json({ user: user.toJSON() });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  clearToken(res);
  res.json({ ok: true });
});

// GET /api/auth/me -> who is signed in, for restoring state on a reload
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not signed in' });
  res.json({ user: req.user.toJSON() });
});

// PATCH /api/auth/me -> edit the profile
router.patch('/me', needsDb, requireAuth, async (req, res) => {
  const { username, email, firstName, lastName } = req.body ?? {};

  try {
    if (username !== undefined) req.user.username = username;
    if (email !== undefined) req.user.email = email;
    if (firstName !== undefined) req.user.firstName = firstName.trim();
    if (lastName !== undefined) req.user.lastName = lastName.trim();
    await req.user.save();
    res.json({ user: req.user.toJSON() });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern ?? {})[0];
      return res.status(409).json({ error: `That ${field === 'email' ? 'email address' : 'username'} is already taken` });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors)[0].message });
    }
    res.status(500).json({ error: 'Could not save those changes' });
  }
});

export default router;
