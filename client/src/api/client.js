
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

export const getMyLocation = () => request('/api/geo/me');

export const searchPlaces = (query, city) =>
  request(`/api/places/search?q=${encodeURIComponent(query)}&city=${encodeURIComponent(city || '')}`);

export const lookupPlace = (osmId) =>
  request(`/api/places/lookup?osmId=${encodeURIComponent(osmId)}`);

export const getNearbyPlaces = ({ lat, lng, category = 'cafe', radius = 3, limit = 12 }) =>
  request(
    `/api/places/nearby?lat=${lat}&lng=${lng}&category=${encodeURIComponent(category)}` +
      `&radius=${radius}&limit=${limit}`
  );

export const getRestrooms = ({ lat, lng, unisex = false, ada = false, perPage = 20 }) =>
  request(
    `/api/restrooms?lat=${lat}&lng=${lng}&unisex=${unisex}&ada=${ada}&per_page=${perPage}`
  );

export const getOsmPlaces = ({ lat, lng, radius = 10, categories, limit = 60 }) =>
  request(
    `/api/osm?lat=${lat}&lng=${lng}&radius=${radius}` +
      `&categories=${encodeURIComponent(categories)}&limit=${limit}`
  );

export const searchReddit = ({ q, sub = 'Transgender_Surgeries', limit = 10 }) =>
  request(`/api/reddit/search?q=${encodeURIComponent(q)}&sub=${sub}&limit=${limit}`);

export const getSurgeryTaxonomy = () => request('/api/reddit/taxonomy');

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

export const getBusinesses = () => request('/api/businesses');

export const getBusiness = (osmId) => request(`/api/businesses/${encodeURIComponent(osmId)}`);

export const saveBusiness = (business) =>
  request('/api/businesses', { method: 'POST', body: JSON.stringify(business) });

export const addReview = (osmId, review) =>
  request(`/api/businesses/${encodeURIComponent(osmId)}/reviews`, {
    method: 'POST',
    body: JSON.stringify(review),
  });
