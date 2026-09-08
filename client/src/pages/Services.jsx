import { useEffect, useState } from 'react';

import { getMyLocation, getOsmPlaces } from '../api/client.js';
import { toKm } from '../utils/distance.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import MapShell from '../components/MapShell.jsx';
import RangeControl from '../components/RangeControl.jsx';
import BusinessCard from '../components/BusinessCard.jsx';
import Switch from '../components/Switch.jsx';
import SearchField from '../components/SearchField.jsx';

// Each service maps to the OpenStreetMap tags that actually carry it.
// Electrolysis, laser and threading are not distinct OSM tags, so those fall
// back to shop=beauty narrowed by a name keyword.
const SERVICES = [
  { id: 'electrolysis', label: 'Electrolysis', categories: ['beauty'], keywords: ['electrolysis', 'electrolog'] },
  { id: 'laser', label: 'Laser Hair Removal', categories: ['beauty'], keywords: ['laser', 'hair removal'] },
  { id: 'threading', label: 'Eyebrow Threading', categories: ['beauty'], keywords: ['thread', 'brow'] },
  { id: 'nails', label: 'Nail Salon', categories: ['nails', 'beauty'], keywords: [] },
  { id: 'massage', label: 'Massage', categories: ['massage', 'spa'], keywords: [] },
];

export default function Services() {
  const [location, setLocation] = useState(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState({ nails: true, massage: true });
  const [unit, setUnit] = useState('mi');
  const [range, setRange] = useState(6);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const debouncedQuery = useDebouncedValue(query, 400);
  // Dragging the slider must not fire an Overpass call per pixel.
  const debouncedRange = useDebouncedValue(range, 500);
  const radiusKm = toKm(debouncedRange, unit);

  useEffect(() => {
    getMyLocation()
      .then(setLocation)
      .catch((err) => setError(err.message));
  }, []);

  const selected = SERVICES.filter((s) => active[s.id]);
  const categoryKey = [...new Set(selected.flatMap((s) => s.categories))].sort().join(',');

  useEffect(() => {
    if (!location || !categoryKey) {
      setPlaces([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    getOsmPlaces({ lat: location.lat, lng: location.lng, radius: radiusKm, categories: categoryKey })
      .then(({ results }) => !cancelled && setPlaces(results))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [location, categoryKey, radiusKm]);

  // A service with keywords only matches places whose name mentions it, since
  // OSM has no tag for it. Services without keywords match on tag alone.
  const matchesSelection = (place) => {
    const name = place.name.toLowerCase();
    return selected.some((service) => {
      if (!service.categories.includes(place.category) && !service.categories.includes('beauty')) return false;
      if (service.keywords.length === 0) return service.categories.includes(place.category);
      return service.keywords.some((k) => name.includes(k));
    });
  };

  const visible = places
    .filter(matchesSelection)
    .filter((p) => !debouncedQuery.trim() || p.name.toLowerCase().includes(debouncedQuery.toLowerCase().trim()));

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
      search={<SearchField value={query} onChange={setQuery} placeholder="Filter by name" />}
    >
      <RangeControl range={range} unit={unit} onRangeChange={setRange} onUnitChange={setUnit} />

      <div className="group">
        <div className="group-label">Services</div>
        {SERVICES.map((service) => (
          <Switch
            key={service.id}
            id={service.id}
            label={service.label}
            checked={Boolean(active[service.id])}
            onChange={(v) => setActive((a) => ({ ...a, [service.id]: v }))}
          />
        ))}
      </div>

      <div className="group-label">
        Search Results{location ? ` - within ${range} ${unit} of ${location.city}` : ''}
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading...</p>}

      {visible.map((place) => (
        <BusinessCard key={place.osmId} business={place} unit="mi" />
      ))}

      {!loading && visible.length === 0 && !error && (
        <p className="empty">
          {selected.length === 0
            ? 'Turn on a service to see places nearby.'
            : `No matching places found within ${range} ${unit}.`}
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
