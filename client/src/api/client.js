// Proxy API calls to the server

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    // The session lives in an httpOnly cookie, so it has to ride along.
    credentials: 'include',
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
}

// GeoJS - approximate location from the visitor's IP address.
export const getMyLocation = () => request('/api/geo/me');

// Nominatim - search for places by name and city.
export const searchPlaces = (query, city) =>
  request(`/api/places/search?q=${encodeURIComponent(query)}&city=${encodeURIComponent(city || '')}`);

// Nominatim - resolve one OSM id back into a place, so a profile page works
export const lookupPlace = (osmId) =>
  request(`/api/places/lookup?osmId=${encodeURIComponent(osmId)}`);

// Nominatim - businesses of a category within a radius (km) of a point.
export const getNearbyPlaces = ({ lat, lng, category = 'cafe', radius = 3, limit = 12 }) =>
  request(
    `/api/places/nearby?lat=${lat}&lng=${lng}&category=${encodeURIComponent(category)}` +
      `&radius=${radius}&limit=${limit}`
  );

// Refuge Restrooms - safe/accessible restrooms near a point.
export const getRestrooms = ({ lat, lng, unisex = false, ada = false, perPage = 20 }) =>
  request(
    `/api/restrooms?lat=${lat}&lng=${lng}&unisex=${unisex}&ada=${ada}&per_page=${perPage}`
  );

// HRC Corporate Equality Index seed set
// Overpass / OpenStreetMap tag search. Nominatim's free-text search barely
// finds category places ("nail salon" returns almost nothing); tag search does.
export const getOsmPlaces = ({ lat, lng, radius = 10, categories, limit = 60 }) =>
  request(
    `/api/osm?lat=${lat}&lng=${lng}&radius=${radius}` +
      `&categories=${encodeURIComponent(categories)}&limit=${limit}`
  );

// Reddit post-op reports. Returns links and short attributed excerpts only.
// I really wanted this to work as it would keep the app up to date if it did. but I can't get the Developer API to work on Reddit.
export const searchReddit = ({ q, sub = 'Transgender_Surgeries', limit = 10 }) =>
  request(`/api/reddit/search?q=${encodeURIComponent(q)}&sub=${sub}&limit=${limit}`);

export const getSurgeryTaxonomy = () => request('/api/reddit/taxonomy');

// Hand-kept surgeon directory
// Replaced with mongodb this is a fallback.
export const getSurgeon = (slug) => request(`/api/surgeons/${encodeURIComponent(slug)}`);

export const addSurgeonReview = (slug, review) =>
  request(`/api/surgeons/${encodeURIComponent(slug)}/reviews`, {
    method: 'POST',
    body: JSON.stringify(review),
  });

export const getSurgeons = ({ procedures = '', region = '', kind = '' } = {}) =>
  request(
    `/api/surgeons?procedures=${encodeURIComponent(procedures)}` +
      `&region=${encodeURIComponent(region)}&kind=${encodeURIComponent(kind)}`
  );

export const getCEI = () => request('/api/cei');

// Our own database of community-rated places.
export const getBusinesses = () => request('/api/businesses');

export const getBusiness = (osmId) => request(`/api/businesses/${encodeURIComponent(osmId)}`);

export const saveBusiness = (business) =>
  request('/api/businesses', { method: 'POST', body: JSON.stringify(business) });

export const addReview = (osmId, review) =>
  request(`/api/businesses/${encodeURIComponent(osmId)}/reviews`, {
    method: 'POST',
    body: JSON.stringify(review),
  });

// Accounts. The session is an httpOnly cookie, so nothing is stored here.
const send = (path, body, method = 'POST') =>
  request(path, { method, body: JSON.stringify(body) });

export const register = (fields) => send('/api/auth/register', fields);

export const login = (loginName, password) =>
  send('/api/auth/login', { login: loginName, password });

export const logout = () => send('/api/auth/logout', {});
export const getMe = () => request('/api/auth/me');
export const updateMe = (changes) => send('/api/auth/me', changes, 'PATCH');

// Saved places.
export const getFavorites = () => request('/api/favorites');

export const addFavorite = (favorite) => send('/api/favorites', favorite);

export const removeFavorite = (kind, refId) =>
  request(`/api/favorites/${kind}/${encodeURIComponent(refId)}`, { method: 'DELETE' });

// Business Safety Score for every ZIP on the map.
// ZIP areas in a [west, south, east, north] box, or every scored ZIP without one.
export const getZipScores = (bbox) =>
  request(bbox ? `/api/zipscores?bbox=${bbox.map((value) => value.toFixed(4)).join(',')}` : '/api/zipscores');
export const getZipScore = (zip) => request(`/api/zipscores/${encodeURIComponent(zip)}`);

export const getWebReviews = () => request('/api/reviews');
