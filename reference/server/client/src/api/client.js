// Every call goes to our own Express server, which proxies the third-party
// APIs. Keeps keys, rate limiting and caching on the server side.

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
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
