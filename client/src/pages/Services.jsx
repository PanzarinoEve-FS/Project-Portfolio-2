import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import PlaceDetail from '../components/Profile/PlaceDetail.jsx';

import { getMyLocation, getOsmPlaces } from '../api/client.js';
import { toKm, fromKm, distanceInMetres } from '../utils/distance.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import MapShell from '../components/Map/MapShell.jsx';
import RangeControl, { stopsFor } from '../components/Apple Design Elements/RangeControl.jsx';

// How far the search may widen itself before giving up.
const MAX_WIDEN_STEPS = 6;
import BusinessCard from '../components/Profile/BusinessCard.jsx';
import SearchField from '../components/Apple Design Elements/SearchField.jsx';

const SERVICES = [
  { id: 'electrolysis', label: 'Electrolysis', categories: ['beauty'], keywords: ['electrolysis', 'electrolog'] },
  { id: 'laser', label: 'Laser Hair Removal', categories: ['beauty'], keywords: ['laser', 'hair removal'] },
  { id: 'threading', label: 'Eyebrow Threading', categories: ['beauty'], keywords: ['thread', 'brow'] },
  { id: 'nails', label: 'Nail Salon', categories: ['nails', 'beauty'], keywords: [] },
  { id: 'massage', label: 'Massage', categories: ['massage', 'spa'], keywords: [] },
];

export default function Services() {
  const { osmId } = useParams();
  const [location, setLocation] = useState(null);
  const [query, setQuery] = useState('');
  const [service, setService] = useState('nails');
  const [unit, setUnit] = useState('mi');
  const [range, setRange] = useState(5);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [cappedKm, setCappedKm] = useState(null);
  // Set when an empty search was widened on the visitor's behalf.
  const [autoJump, setAutoJump] = useState(null);
  // A ref, not state: as state it would be a dependency of the probe effect and
  // would cancel the very request it tracks.
  // setLoading(true) inside an effect does not apply until the next render, so
  // the probe could see loading===false and fire before the first search had
  // even returned. This ref flips synchronously.
  const searchRan = useRef(false);
  // Bounds the widening so a category with nothing anywhere cannot walk the
  // whole ladder.
  const widenSteps = useRef(0);

  const debouncedQuery = useDebouncedValue(query, 400);

  const debouncedRange = useDebouncedValue(range, 500);
  const radiusKm = toKm(debouncedRange, unit);

  useEffect(() => {
    getMyLocation()
      .then(setLocation)
      .catch((err) => setError(err.message));
  }, []);

  const chosen = SERVICES.find((s) => s.id === service) ?? SERVICES[0];
  const categoryKey = [...new Set(chosen.categories)].sort().join(',');

  useEffect(() => {
    if (!location || !categoryKey) {
      setPlaces([]);
      return;
    }

    let cancelled = false;
    searchRan.current = false;
    setLoading(true);
    setError('');

    getOsmPlaces({
      lat: location.lat,
      lng: location.lng,
      radius: radiusKm,
      categories: categoryKey,
      // Electrolysis, laser and threading are matched on the business name
      // here, so the whole set has to arrive. A default-sized page of a wide
      // search is nearly all plain beauty salons, and the few real matches get
      // truncated away -- which is why a result could vanish as the range grew.
      limit: 3000,
    })
      .then(({ results, cappedAtKm }) => {
        if (cancelled) return;
        setPlaces(results);
        setCappedKm(cappedAtKm ?? null);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => {
        if (cancelled) return;
        searchRan.current = true;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [location, categoryKey, radiusKm]);

  // Electrolysis, laser and threading share shop=beauty, so those are narrowed
  // by a name keyword; the rest match on the tag alone.
  const matchesSelection = (place) => {
    if (chosen.keywords.length === 0) return chosen.categories.includes(place.category);

    const name = place.name.toLowerCase();
    return chosen.keywords.some((k) => name.includes(k));
  };

  const visible = places
    .filter(matchesSelection)
    .filter((p) => !debouncedQuery.trim() || p.name.toLowerCase().includes(debouncedQuery.toLowerCase().trim()));

  // When nothing matches in range, widen one stop at a time until something
  // does, up to a handful of steps.
  //
  // An earlier version probed once at the widest range and jumped to the
  // nearest hit it saw. That was wrong: neither Nominatim nor a capped Overpass
  // query returns nearest-first, so "closest in the sample" was not the closest
  // that exists -- it once skipped a clinic 10 miles away to land on one 300
  // miles out. Stepping is a few more requests but lands on the smallest range
  // that actually works.
  useEffect(() => {
    if (!searchRan.current || loading || error || !location) return;
    if (visible.length > 0 || range !== debouncedRange) return;
    if (widenSteps.current >= MAX_WIDEN_STEPS) return;

    const stops = stopsFor(unit);
    const next = stops.find((stop) => stop > range);
    if (!next) return;

    widenSteps.current += 1;
    setAutoJump((prev) => ({ from: prev?.from ?? range, to: next }));
    setRange(next);
  }, [loading, error, location, visible.length, range, debouncedRange, unit]);

  return (
    <MapShell
      title="Transgender Services"
      subtitle="Hair removal, nails, massage"
      center={location ? [location.lat, location.lng] : [28.5978, -81.3024]}
      zoom={12}
      markers={visible.map((p) => ({
        id: p.osmId,
        osmId: p.osmId,
        name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        tags: [p.category],
      }))}
      search={<SearchField value={query} onChange={setQuery} placeholder="Search Services" />}
      detail={osmId ? <PlaceDetail osmId={osmId} backTo="/services" backLabel="Back to services" /> : null}
    >
      <RangeControl
        range={range}
        unit={unit}
        onRangeChange={(next) => {
          setAutoJump(null);
          widenSteps.current = 0;
          setRange(next);
        }}
        onUnitChange={setUnit}
      />

      {cappedKm && (
        <p className="muted">
          OpenStreetMap will only answer a tag search out to about{' '}
          {Math.round(fromKm(cappedKm, unit))} {unit}, so that is how far this searched.
        </p>
      )}

      <div className="group-label">Services</div>
      <div className="chips" style={{ marginBottom: 14 }}>
        {SERVICES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              setAutoJump(null);
              widenSteps.current = 0;
              setService(option.id);
            }}
            className={option.id === service ? 'chip active' : 'chip'}
          >
            {option.label}
          </button>
        ))}
      </div>

      {autoJump && (
        <p className="muted auto-jump">
          Nothing within {autoJump.from} {unit}, so the range widened to{' '}
          {autoJump.to} {unit}.
        </p>
      )}

      <div className="group-label">
        Search Results{location ? ` - within ${range} ${unit} of ${location.city}` : ''}
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading...</p>}

      {visible.map((place) => (
        <BusinessCard key={place.osmId} business={place} unit={unit} to="/service" />
      ))}

      {!loading && visible.length === 0 && !error && (
        <p className="empty">
          {widenSteps.current >= MAX_WIDEN_STEPS
            ? `No ${chosen.label.toLowerCase()} found, even out to ${range} ${unit}.`
            : `No ${chosen.label.toLowerCase()} found within ${range} ${unit}. Widening...`}
        </p>
      )}

      <p className="muted disclaimer">
        Places come from OpenStreetMap. Electrolysis, laser and threading are not
        recorded as their own categories there, so those are matched on the
        business name and the list will be incomplete.
      </p>
    </MapShell>
  );
}
