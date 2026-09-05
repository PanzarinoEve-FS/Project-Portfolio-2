import { useEffect, useState } from 'react';

import { getMyLocation, getNearbyPlaces, getRestrooms, getCEI } from '../api/client.js';
import { findNearestRestroom, toKm, fromKm } from '../utils/distance.js';
import { matchCEI } from '../utils/cei.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import MapView from '../components/MapView.jsx';
import BusinessCard from '../components/BusinessCard.jsx';

const CATEGORIES = ['cafe', 'restaurant', 'bar', 'pharmacy', 'clinic'];

const RANGE_BOUNDS = {
  km: { min: 1, max: 25, step: 1 },
  mi: { min: 1, max: 15, step: 1 },
};

export default function Home() {
  const [location, setLocation] = useState(null);
  const [category, setCategory] = useState('cafe');
  const [unit, setUnit] = useState('km');
  const [range, setRange] = useState(3);
  const [filters, setFilters] = useState({ unisex: false, ada: false });
  const [places, setPlaces] = useState([]);
  const [restrooms, setRestrooms] = useState([]);
  const [cei, setCei] = useState({ entries: [], maxScore: 100 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Only refetch once the slider settles

  const debouncedRange = useDebouncedValue(range, 500);
  const radiusKm = toKm(debouncedRange, unit);

  // GeoJS gives an approximate location from the visitor's IP - no browser permission prompt.
  useEffect(() => {
    getMyLocation()
      .then(setLocation)
      .catch((err) => setError(err.message));
  }, []);

  // Load the latest CEI data
  useEffect(() => {
    getCEI()
      .then(setCei)
      .catch(() => {});
  }, []);

  // Load nearby businesses plus the documented restrooms around them.
  useEffect(() => {
    if (!location) return;

    let cancelled = false;
    setLoading(true);
    setError('');

    const { lat, lng } = location;

    Promise.all([
      getNearbyPlaces({
        lat,
        lng,
        category,
        radius: radiusKm,
        // Widening the range should surface more places, not the same
        // handful spread further out. 40 is Nominatim's practical ceiling.
        limit: Math.min(40, Math.max(12, Math.round(radiusKm * 4))),
      }),
      getRestrooms({
        lat,
        lng,
        unisex: filters.unisex,
        ada: filters.ada,
        // Widen the restroom pull as the search area grows.
        perPage: Math.min(100, Math.round(radiusKm * 12)),
      }).catch(() => []),
    ])
      .then(([nearby, rooms]) => {
        if (cancelled) return;
        setPlaces(nearby.results);
        setRestrooms(rooms);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [location, category, radiusKm, filters.unisex, filters.ada]);

  // Switching units keeps the real distance the same rather than the number,
  // so 5km becomes ~3mi instead of jumping to 5mi.
  function handleUnitChange(nextUnit) {
    const bounds = RANGE_BOUNDS[nextUnit];
    const converted = fromKm(toKm(range, unit), nextUnit);
    const snapped = Math.round(converted / bounds.step) * bounds.step;

    setUnit(nextUnit);
    setRange(Math.min(bounds.max, Math.max(bounds.min, snapped)));
  }

  function toggleFilter(key) {
    setFilters((current) => ({ ...current, [key]: !current[key] }));
  }

  // Attach the closest documented restroom so an unrated business can still
  // say something useful about bathroom access.
  const placesWithRestrooms = places.map((place) => ({
    place,
    nearestRestroom: findNearestRestroom(place, restrooms),
    cei: matchCEI(place.name, cei.entries),
  }));

  // The restroom list is already filtered server-side, so any match found
  // here satisfies the active filters. With a filter on, drop the places
  // that have no match rather than showing them as "Not rated yet".
  const filtersActive = filters.unisex || filters.ada;
  const visiblePlaces = filtersActive
    ? placesWithRestrooms.filter(({ nearestRestroom }) => nearestRestroom)
    : placesWithRestrooms;

  const filterLabel = [
    filters.unisex && 'gender-neutral',
    filters.ada && 'wheelchair accessible',
  ]
    .filter(Boolean)
    .join(' and ');

  const bounds = RANGE_BOUNDS[unit];
  const rangeLabel = `${range} ${unit === 'mi' ? (range === 1 ? 'mile' : 'miles') : 'km'}`;

  return (
    <section className="page">
      {error && <p className="error">{error}</p>}

      {!location && !error && <p className="muted">Detecting your location...</p>}

      {location && (
        <>
          <h1>
            Near {location.city}
            {location.region ? `, ${location.region}` : ''}
          </h1>
          <p className="muted">
            {filtersActive
              ? `Showing ${visiblePlaces.length} of ${places.length} ${category} places within ${rangeLabel} with a documented ${filterLabel} restroom.`
              : `Businesses within ${rangeLabel} of your approximate location.`}
          </p>

          <div className="controls">
            <div className="control-group">
              <span className="control-label">Category</span>
              <div className="chips">
                {CATEGORIES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCategory(option)}
                    className={option === category ? 'chip active' : 'chip'}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label className="control-label" htmlFor="range">
                Search range
              </label>
              <div className="range-row">
                <input
                  id="range"
                  type="range"
                  min={bounds.min}
                  max={bounds.max}
                  step={bounds.step}
                  value={range}
                  onChange={(e) => setRange(Number(e.target.value))}
                />
                <output className="range-value" htmlFor="range">
                  {rangeLabel}
                </output>
                <select
                  value={unit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  aria-label="Distance unit"
                >
                  <option value="km">Kilometers</option>
                  <option value="mi">Miles</option>
                </select>
              </div>
            </div>

            <div className="control-group">
              <span className="control-label">Bathroom access</span>
              <div className="filters">
                <label>
                  <input
                    type="checkbox"
                    checked={filters.unisex}
                    onChange={() => toggleFilter('unisex')}
                  />
                  Gender-neutral only
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.ada}
                    onChange={() => toggleFilter('ada')}
                  />
                  Wheelchair accessible only
                </label>
              </div>
            </div>
          </div>

          <MapView
            center={[location.lat, location.lng]}
            zoom={13}
            markers={visiblePlaces.map(({ place, nearestRestroom }) => ({
              id: place.osmId,
              osmId: place.osmId,
              name: place.name,
              address: place.address,
              lat: place.lat,
              lng: place.lng,
              tags: [place.category, nearestRestroom && 'restroom nearby'].filter(Boolean),
            }))}
          />

          {loading && <p className="muted">Loading nearby places...</p>}

          <div className="grid">
            {visiblePlaces.map(({ place, nearestRestroom, cei: ceiMatch }) => (
              <BusinessCard
                key={place.osmId}
                business={place}
                nearestRestroom={nearestRestroom}
                unit={unit}
                cei={ceiMatch}
              />
            ))}
          </div>

          {!loading && visiblePlaces.length === 0 && (
            <p className="empty">
              {filtersActive && places.length > 0
                ? `None of the ${places.length} ${category} places within ${rangeLabel} have a documented ${filterLabel} restroom.`
                : `No ${category} found within ${rangeLabel}.`}
            </p>
          )}
        </>
      )}
    </section>
  );
}
