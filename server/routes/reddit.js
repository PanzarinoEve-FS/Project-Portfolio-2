import express from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const router = express.Router();

const taxonomy = JSON.parse(
  readFileSync(fileURLToPath(new URL('../data/surgery-taxonomy.json', import.meta.url)), 'utf8')
);

const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const API = 'https://oauth.reddit.com';
const SUBREDDIT = 'TransSurgeriesWiki';

const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const MIN_REQUEST_GAP_MS = 700;

let token = null;
let tokenExpiresAt = 0;
let lastRequestAt = 0;
let queue = Promise.resolve();

function credentials() {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
}

const userAgent = () =>
  process.env.REDDIT_USER_AGENT || 'macos:lgbtqia-safety-app:v1.0 (portfolio project)';

function throttled(task) {
  const run = queue.then(async () => {
    const waitFor = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
    if (waitFor > 0) await new Promise((r) => setTimeout(r, waitFor));
    lastRequestAt = Date.now();
    return task();
  });
  queue = run.catch(() => {});
  return run;
}

async function getToken() {
  if (token && Date.now() < tokenExpiresAt) return token;

  const creds = credentials();
  if (!creds) throw Object.assign(new Error('missing-credentials'), { status: 503 });

  const basic = Buffer.from(`${creds.id}:${creds.secret}`).toString('base64');

  const response = await throttled(() =>
    fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent(),
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    })
  );

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw Object.assign(new Error('Reddit returned a non-JSON token response'), { status: 502 });
  }

  if (!response.ok || !data.access_token) {
    const bad = response.status === 401;
    throw Object.assign(new Error(bad ? 'invalid-credentials' : 'token-failed'), {
      status: bad ? 401 : 502,
    });
  }

  token = data.access_token;

  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return token;
}

async function apiGet(path) {
  const bearer = await getToken();

  const response = await throttled(() =>
    fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${bearer}`, 'User-Agent': userAgent() },
    })
  );

  if (response.status === 401) {
    token = null;
    throw Object.assign(new Error('token-rejected'), { status: 401 });
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error('Reddit returned a non-JSON response'), { status: 502 });
  }
}

function fail(res, err) {
  const messages = {
    'missing-credentials':
      'Reddit is not configured. Add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET to server/.env.',
    'invalid-credentials': 'Reddit rejected the credentials in server/.env.',
  };
  res.status(err.status || 500).json({ error: messages[err.message] || err.message });
}

router.get('/taxonomy', (req, res) => {
  const { _about, ...rest } = taxonomy;
  res.set('Cache-Control', 'public, max-age=86400');
  res.json(rest);
});

router.get('/status', async (req, res) => {
  if (!credentials()) {
    return res.json({ configured: false, reason: 'REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET not set' });
  }
  try {
    await getToken();
    res.json({ configured: true, subreddit: SUBREDDIT });
  } catch (err) {
    res.json({ configured: false, reason: err.message });
  }
});

router.get('/wiki', async (req, res) => {
  const page = String(req.query.page || 'index').replace(/[^a-z0-9/_-]/gi, '');
  const key = `wiki|${page}`;
  const hit = cache.get(key);

  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return res.json({ cached: true, ...hit.value });
  }

  try {
    const data = await apiGet(`/r/${SUBREDDIT}/wiki/${page}`);

    if (data.kind !== 'wikipage') {
      return res.status(404).json({ error: `No wiki page named "${page}"` });
    }

    const value = {
      page,
      markdown: data.data.content_md || '',
      revisedAt: data.data.revision_date ? data.data.revision_date * 1000 : null,
      source: `https://www.reddit.com/r/${SUBREDDIT}/wiki/${page}/`,
    };

    cache.set(key, { at: Date.now(), value });
    res.json({ cached: false, ...value });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const sub = String(req.query.sub || 'Transgender_Surgeries').replace(/[^a-z0-9_]/gi, '');
  const limit = Math.min(50, Number(req.query.limit) || 15);

  if (!q) return res.status(400).json({ error: 'q is required' });

  const key = `search|${sub}|${q}|${limit}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return res.json({ cached: true, results: hit.value });
  }

  try {
    const params = new URLSearchParams({
      q,
      restrict_sr: '1',
      sort: 'relevance',
      limit: String(limit),
      t: 'all',
    });
    const data = await apiGet(`/r/${sub}/search?${params}`);

    const results = (data.data?.children || []).map(({ data: post }) => ({
      id: post.id,
      title: post.title,
      author: post.author,
      subreddit: post.subreddit,
      createdAt: post.created_utc * 1000,
      score: post.score,
      comments: post.num_comments,
      permalink: `https://www.reddit.com${post.permalink}`,
      excerpt: (post.selftext || '').slice(0, 280),
    }));

    cache.set(key, { at: Date.now(), value: results });
    res.json({ cached: false, results });
  } catch (err) {
    fail(res, err);
  }
});

export default router;
