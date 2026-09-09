import { useEffect, useState } from 'react';

import { getMyLocation, getOsmPlaces, searchPlaces } from '../api/client.js';
import { toKm } from '../utils/distance.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import MapShell from '../components/MapShell.jsx';
import RangeControl from '../components/RangeControl.jsx';
import Switch from '../components/Switch.jsx';
import SearchField from '../components/SearchField.jsx';

const STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
];

const COUNTRIES = [
  'Thailand', 'Canada', 'Austrailia', 'Europe', 'UK', 'South America', 'Other'
];

const PROCEDURES = [
  { group: 'Trans feminine surgeries', items: [
    { id: 'fem-ffs', label: 'Facial Feminization Surgery' },
    { id: 'fem-top', label: 'Top Surgery' },
    { id: 'fem-bottom', label: 'Bottom Surgery' },
  ]},
];

const redditSearch = (name) =>
  `https://www.reddit.com/search/?q=${encodeURIComponent(`${name} surgery post-op`)}`;

export default function Surgeries() {
  const [location, setLocation] = useState(null);
  const [scope, setScope] = useState('near');
  const [unit, setUnit] = useState('mi');
  // Surgical centres are sparse, so this starts wider than the other views.
  const [range, setRange] = useState(25);
  const [stateName, setStateName] = useState('Florida');
  const [countryName, setCountryName] = useState('Thailand');
  const [query, setQuery] = useState('');
  const [procedures, setProcedures] = useState({});
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    // Near me uses Overpass tag search. A whole state or country is far too
    // large for a radius query, so those use Nominatim's text search -- run
    // twice and merged, because "surgery center" is an Americanism that
    // returns nothing in Spain or the UK, while "hospital" travels.
    const place = scope === 'state' ? stateName : countryName;
    const terms = scope === 'state'
      ? ['surgery center', 'plastic surgery']
      : ['hospital', 'plastic surgery'];

    const lookup =
      scope === 'near'
        ? location
          ? getOsmPlaces({
              lat: location.lat,
              lng: location.lng,
              radius: radiusKm,
              categories: 'clinic,hospital,doctors',
            })
          : null
        : Promise.all(terms.map((term) => searchPlaces(term, place).catch(() => ({ results: [] }))))
            .then((responses) => {
              const seen = new Map();
              for (const { results } of responses) {
                for (const item of results) if (!seen.has(item.osmId)) seen.set(item.osmId, item);
              }
              return { results: [...seen.values()] };
            });

    if (!lookup) return undefined;

    lookup
      .then(({ results }) => !cancelled && setPlaces(results))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [scope, stateName, countryName, location, radiusKm]);

  const visible = places.filter(
    (p) => !debouncedQuery.trim() || p.name.toLowerCase().includes(debouncedQuery.toLowerCase().trim())
  );

  const wanted = PROCEDURES.flatMap((g) => g.items).filter((i) => procedures[i.id]);

  return (
    <MapShell
      title="Transgender Surgeries"
      subtitle="Find surgical centers"
      center={
        scope === 'near' && location
          ? [location.lat, location.lng]
          : visible[0]
            ? [visible[0].lat, visible[0].lng]
            : [28.5978, -81.3024]
      }
      zoom={scope === 'near' ? 11 : scope === 'state' ? 7 : 5}
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
      <div className="group">
        <div className="group-label">Where</div>
        <div className="segmented" style={{ marginBottom: 8 }}>
          {[
            ['near', 'Near me'],
            ['state', 'By state'],
            ['country', 'Other countries'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={scope === value ? 'active' : ''}
              onClick={() => setScope(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {scope === 'state' && (
          <select
            value={stateName}
            onChange={(e) => setStateName(e.target.value)}
            aria-label="State"
            style={{ width: '100%' }}
          >
            {STATES.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        )}

        {scope === 'country' && (
          <select
            value={countryName}
            onChange={(e) => setCountryName(e.target.value)}
            aria-label="Country"
            style={{ width: '100%' }}
          >
            {COUNTRIES.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        )}
      </div>

      {scope === 'near' && (
        <RangeControl
          range={range}
          unit={unit}
          onRangeChange={setRange}
          onUnitChange={setUnit}
          id="surgery-range"
        />
      )}

      {PROCEDURES.map(({ group, items }) => (
        <div className="group" key={group}>
          <div className="group-label">{group}</div>
          {items.map((item) => (
            <Switch
              key={item.id}
              id={item.id}
              label={item.label}
              checked={Boolean(procedures[item.id])}
              onChange={(v) => setProcedures((p) => ({ ...p, [item.id]: v }))}
            />
          ))}
        </div>
      ))}



      <div className="group-label">Search Results</div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading...</p>}

      {visible.map((place) => (
        <article className="card" key={place.osmId}>
          <div className="card-head">
            <h3>{place.name}</h3>
          </div>
          {place.category && <span className="tag">{place.category}</span>}
          <p className="address">{place.address}</p>
          <div className="card-foot">
            <a href={redditSearch(place.name)} target="_blank" rel="noreferrer">
              Reddit post-op reports
            </a>
          </div>
        </article>
      ))}

      {!loading && visible.length === 0 && !error && (
        <p className="empty">
          No centers found. Try a wider range, another state, or a different country.
        </p>
      )}

      <p className="muted disclaimer">
        <strong>These are not verified providers.</strong> OpenStreetMap records that a
        place is a clinic or hospital, never which procedures it performs, so nothing
        here confirms that a centre offers
        {wanted.length > 0 ? ` ${wanted.map((w) => w.label.toLowerCase()).join(' or ')}` : ' any specific surgery'}.
        Use it as a starting point and confirm directly with the provider or a
        directory such as WPATH.
      </p>
    </MapShell>
  );
}
