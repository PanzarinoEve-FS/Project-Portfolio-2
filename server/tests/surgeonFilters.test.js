import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import surgeonsRouter from '../routes/surgeons.js';

// No database is started, so the route takes its seed-file path and every answer is decided by the committed data. 
const app = express();
app.use('/api/surgeons', surgeonsRouter);

const seed = JSON.parse(
  readFileSync(fileURLToPath(new URL('../data/surgeons.json', import.meta.url)), 'utf8')
);

const isCenter = (entry) => entry.kind !== 'surgeon';
const offers = (entry, wanted) => (entry.procedures ?? []).some((p) => wanted.includes(p));


function expected({ procedures = [], kind = '', region = '' } = {}) {
  const centersOnly = kind === 'center';
  const surgeonsOnly = kind === 'surgeon';
  let rows = seed.entries;

  if (procedures.length) {
    rows = rows.filter((entry) => {
      if (offers(entry, procedures)) return true;
      if (!centersOnly) return false;
      return seed.entries.some(
        (other) =>
          other.kind === 'surgeon' && other.clinic === entry.name && offers(other, procedures)
      );
    });
  }
  if (region) rows = rows.filter((entry) => entry.region === region);
  if (centersOnly) rows = rows.filter(isCenter);
  else if (surgeonsOnly) rows = rows.filter((entry) => entry.kind === 'surgeon');
  return rows;
}

const get = (query = {}) => {
  const qs = new URLSearchParams(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== '')
  ).toString();
  return request(app).get(`/api/surgeons${qs ? `?${qs}` : ''}`).expect(200);
};

const zipsOf = (body) => body.entries.map((entry) => entry.name).sort();

beforeAll(() => {
 
  expect(mongoose.connection.readyState).toBe(0);
});

describe('no filters', () => {
  test('returns the whole directory', async () => {
    const { body } = await get();
    expect(body.entries).toHaveLength(seed.entries.length);
    expect(body.total).toBe(seed.entries.length);
    expect(body.store).toBe('seed-file');
  });

  test('includes both surgeons and centers', async () => {
    const { body } = await get();
    const kinds = new Set(body.entries.map((entry) => entry.kind));
    expect(kinds.has('surgeon')).toBe(true);
    expect([...kinds].some((kind) => kind !== 'surgeon')).toBe(true);
  });

  test('carries the filter vocabulary the page builds its chips from', async () => {
    const { body } = await get();
    expect(body.procedures.map((p) => p.id)).toEqual(seed.procedures.map((p) => p.id));
    expect(body.regions.map((r) => r.id)).toEqual(seed.regions.map((r) => r.id));
  });

  test('every entry carries a slug the profile route can resolve', async () => {
    const { body } = await get();
    expect(body.entries.every((entry) => typeof entry.slug === 'string' && entry.slug)).toBe(true);
  });
});

describe('one procedure at a time', () => {
  const ids = ['srs', 'ffs', 'vfs', 'breasts', 'top-masc', 'phalloplasty', 'hips-butt'];

  test.each(ids)('%s returns exactly the rows offering it', async (id) => {
    const { body } = await get({ procedures: id });
    expect(zipsOf(body)).toEqual(expected({ procedures: [id] }).map((e) => e.name).sort());
    expect(body.entries.every((entry) => entry.procedures.includes(id))).toBe(true);
  });

  test('a procedure nobody offers returns nothing, not everything', async () => {
    const { body } = await get({ procedures: 'not-a-real-procedure' });
    expect(body.entries).toHaveLength(0);
  });

  test('the unfiltered total is still reported alongside a narrowed list', async () => {
    const { body } = await get({ procedures: 'vfs' });
    expect(body.entries.length).toBeLessThan(body.total);
    expect(body.total).toBe(seed.entries.length);
  });
});

describe('several procedures at once', () => {
  test('matches any of them rather than all of them', async () => {
    const [masc, ffs, both] = await Promise.all([
      get({ procedures: 'top-masc' }),
      get({ procedures: 'ffs' }),
      get({ procedures: 'top-masc,ffs' }),
    ]);
    const union = new Set([...zipsOf(masc.body), ...zipsOf(ffs.body)]);
    expect(zipsOf(both.body)).toEqual([...union].sort());
    expect(both.body.entries.length).toBeGreaterThan(masc.body.entries.length);
  });

  test('order of the ids does not change the answer', async () => {
    const [a, b] = await Promise.all([
      get({ procedures: 'ffs,top-masc' }),
      get({ procedures: 'top-masc,ffs' }),
    ]);
    expect(zipsOf(a.body)).toEqual(zipsOf(b.body));
  });

  test('blank and padded ids are ignored rather than matching nothing', async () => {
    const [plain, messy] = await Promise.all([
      get({ procedures: 'srs' }),
      get({ procedures: ' srs , ,' }),
    ]);
    expect(zipsOf(messy.body)).toEqual(zipsOf(plain.body));
  });
});

describe('kind', () => {
  test('surgeon returns only surgeons', async () => {
    const { body } = await get({ kind: 'surgeon' });
    expect(body.entries.every((entry) => entry.kind === 'surgeon')).toBe(true);
    expect(body.entries).toHaveLength(expected({ kind: 'surgeon' }).length);
  });

  test('center returns no surgeons, and does include teams as well as institutions', async () => {
    const { body } = await get({ kind: 'center' });
    expect(body.entries.some((entry) => entry.kind === 'surgeon')).toBe(false);
    expect(body.entries).toHaveLength(expected({ kind: 'center' }).length);
  });

  test('surgeons and centers together account for the whole directory', async () => {
    const [surgeons, centers] = await Promise.all([
      get({ kind: 'surgeon' }),
      get({ kind: 'center' }),
    ]);
    expect(surgeons.body.entries.length + centers.body.entries.length).toBe(seed.entries.length);
  });

  test('an unrecognised kind filters nothing out', async () => {

    const { body } = await get({ kind: 'centre' });
    expect(body.entries).toHaveLength(seed.entries.length);
  });
});

describe('a center answers for the surgeons listed at it', () => {
  test('filtering centers by top surgery finds far more than carry the tag themselves', async () => {
    const { body } = await get({ kind: 'center', procedures: 'top-masc' });
    const tagged = body.entries.filter((entry) => entry.procedures.includes('top-masc'));
    expect(body.entries.length).toBeGreaterThan(tagged.length);
    expect(body.entries).toHaveLength(expected({ kind: 'center', procedures: ['top-masc'] }).length);
  });

  test('every center returned either carries the tag or says which surgeon supplied it', async () => {
    const { body } = await get({ kind: 'center', procedures: 'top-masc' });
    for (const entry of body.entries) {
      const own = entry.procedures.includes('top-masc');
      const borrowed = (entry.viaStaff ?? []).includes('top-masc');
      expect(own || borrowed).toBe(true);
    }
  });

  test('viaStaff never repeats a procedure the center already lists', async () => {
    const { body } = await get({ kind: 'center', procedures: 'top-masc,ffs,srs' });
    for (const entry of body.entries) {
      for (const id of entry.viaStaff ?? []) expect(entry.procedures).not.toContain(id);
    }
  });

  test('viaStaff only ever names procedures that were actually asked for', async () => {
    const { body } = await get({ kind: 'center', procedures: 'top-masc' });
    for (const entry of body.entries) {
      for (const id of entry.viaStaff ?? []) expect(id).toBe('top-masc');
    }
  });

  test('a borrowed center really does have such a surgeon listed at it', async () => {
    const { body } = await get({ kind: 'center', procedures: 'top-masc' });
    const borrowed = body.entries.filter((entry) => entry.viaStaff?.includes('top-masc'));
    expect(borrowed.length).toBeGreaterThan(0);
    for (const center of borrowed) {
      const staff = seed.entries.filter(
        (entry) => entry.kind === 'surgeon' && entry.clinic === center.name
      );
      expect(staff.some((s) => (s.procedures ?? []).includes('top-masc'))).toBe(true);
    }
  });

  test('surgeons never borrow anything', async () => {
    const { body } = await get({ kind: 'surgeon', procedures: 'top-masc' });
    expect(body.entries.some((entry) => entry.viaStaff)).toBe(false);
    expect(body.entries.every((entry) => entry.procedures.includes('top-masc'))).toBe(true);
  });

  test('borrowing is off when the search is not restricted to centers', async () => {
    const { body } = await get({ procedures: 'top-masc' });
    expect(body.entries.some((entry) => entry.viaStaff)).toBe(false);
    expect(body.entries.every((entry) => entry.procedures.includes('top-masc'))).toBe(true);
  });
});

describe('region', () => {
  test.each(['usa', 'thailand', 'europe'])('%s returns only that region', async (region) => {
    const { body } = await get({ region });
    expect(body.entries.every((entry) => entry.region === region)).toBe(true);
    expect(body.entries).toHaveLength(expected({ region }).length);
  });

  test('a region nobody is in returns nothing', async () => {
    const { body } = await get({ region: 'atlantis' });
    expect(body.entries).toHaveLength(0);
  });
});

describe('filters combine', () => {
  const cases = [
    { procedures: 'srs', kind: 'center', region: 'usa' },
    { procedures: 'top-masc', kind: 'center', region: 'usa' },
    { procedures: 'ffs', kind: 'surgeon', region: 'europe' },
    { procedures: 'top-masc,phalloplasty', kind: 'center', region: 'usa' },
    { procedures: 'srs,ffs,vfs', kind: 'surgeon', region: 'thailand' },
  ];

  test.each(cases)('%o narrows on every axis at once', async (query) => {
    const { body } = await get(query);
    const want = expected({
      procedures: query.procedures.split(','),
      kind: query.kind,
      region: query.region,
    });
    expect(zipsOf(body)).toEqual(want.map((entry) => entry.name).sort());
    expect(body.entries.every((entry) => entry.region === query.region)).toBe(true);
  });

  test('adding a region can only ever narrow the result', async () => {
    const [wide, narrow] = await Promise.all([
      get({ procedures: 'srs', kind: 'center' }),
      get({ procedures: 'srs', kind: 'center', region: 'usa' }),
    ]);
    const wideNames = new Set(zipsOf(wide.body));
    expect(narrow.body.entries.length).toBeLessThanOrEqual(wide.body.entries.length);
    expect(zipsOf(narrow.body).every((name) => wideNames.has(name))).toBe(true);
  });
});
