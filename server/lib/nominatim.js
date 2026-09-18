// Nominatim policy: 1 request/sec, identifying User-Agent, no bulk geocoding.
// https://operations.osmfoundation.org/policies/nominatim/
//
// The queue and cache live here rather than inside one route so every caller
// shares a single budget. Two routes each holding their own throttle would both
// think they owned the whole second.

const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const MIN_REQUEST_GAP_MS = 1100;

let lastRequestAt = 0;
let queue = Promise.resolve();

function throttled(task) {
  const run = queue.then(async () => {
    const waitFor = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
    if (waitFor > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitFor));
    }
    lastRequestAt = Date.now();
    return task();
  });

  queue = run.catch(() => {});
  return run;
}

// A Nominatim row as the rest of the app expects a place to look.
export function normalise(place) {
  return {
    osmId: `${place.osm_type}-${place.osm_id}`,
    name: place.name || place.display_name.split(',')[0],
    address: place.display_name,
    category: place.type,
    lat: Number(place.lat),
    lng: Number(place.lon),
  };
}

// Runs a throttled, cached Nominatim query. `map` shapes each row; geocoding
// needs the raw fields that `normalise` throws away, so it passes its own.
export async function queryNominatim(url, cacheKey, map = normalise) {
  const hit = cache.get(cacheKey);

  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { cached: true, results: hit.results };
  }

  const response = await throttled(() =>
    fetch(url, {
      headers: {
        'User-Agent': process.env.NOMINATIM_USER_AGENT || 'LGBTQIA-Safety-App/1.0',
        'Accept-Language': 'en',
      },
    })
  );

  if (!response.ok) {
    const error = new Error('Nominatim request failed');
    error.status = response.status;
    throw error;
  }

  const results = (await response.json()).map(map);

  cache.set(cacheKey, { at: Date.now(), results });
  return { cached: false, results };
}
