import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getSurgeons, getMyLocation, getSurgeon } from '../api/client.js';
import SurgeonDetail from '../components/Profile/SurgeonDetail.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { distanceInMetres, toKm } from '../utils/distance.js';
import MapShell from '../components/Map/MapShell.jsx';
import RangeControl from '../components/Apple Design Elements/RangeControl.jsx';
import Switch from '../components/Apple Design Elements/Switch.jsx';
import SearchField from '../components/Apple Design Elements/SearchField.jsx';

const PROCEDURES = [
  { id: 'ffs', label: 'Facial Feminization (FFS)' },
  { id: 'srs', label: 'Bottom Surgery (SRS)' },
  { id: 'breasts', label: 'Top Surgery' },
  { id: 'vfs', label: 'Voice Feminization (VFS)' },
];

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
  'Argentina','Australia','Belgium','Brazil','Canada','Chile','Colombia','Denmark',
  'France','Germany','India','Ireland','Italy','Mexico','Netherlands','New Zealand',
  'Norway','Poland','Portugal','Serbia','South Korea','Spain','Sweden','Thailand',
  'Turkey','United Kingdom',
];

const STATUS_TONE = { active: 'good', unclear: 'mixed', retired: 'poor' };

export default function Surgeries() {

  const { slug } = useParams();
  const [openEntry, setOpenEntry] = useState(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState({ srs: true });
  const [scope, setScope] = useState('near');

  const [centresOnly, setCentresOnly] = useState(true);
  const [stateName, setStateName] = useState('Florida');
  const [countryName, setCountryName] = useState('Thailand');
  const [location, setLocation] = useState(null);
  const [unit, setUnit] = useState('mi');

  const [range, setRange] = useState(500);
  const [data, setData] = useState({ entries: [], total: 0, checkedOn: null, source: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    if (!slug) {
      setOpenEntry(null);
      return undefined;
    }
    let cancelled = false;
    getSurgeon(slug)
      .then((d) => !cancelled && setOpenEntry(d))
      .catch(() => !cancelled && setOpenEntry(null));
    return () => {
      cancelled = true;
    };
  }, [slug]);
  const debouncedRange = useDebouncedValue(range, 400);

  useEffect(() => {
    getMyLocation()
      .then(setLocation)
      .catch(() => {});
  }, []);
  const procedures = Object.keys(selected).filter((id) => selected[id]);
  const procedureKey = procedures.sort().join(',');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    getSurgeons({ procedures: procedureKey, kind: centresOnly ? 'centre' : '' })
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [procedureKey, centresOnly]);

  const radiusKm = toKm(debouncedRange, unit);

  const inScope = (e) => {
    if (scope === 'near') {
      if (!location || e.lat == null) return false;
      return distanceInMetres(location, e) / 1000 <= radiusKm;
    }
    if (scope === 'state') return e.region === 'usa' && (!e.state || e.state === stateName);
    return e.country === countryName;
  };

  const elsewhere = data.entries.filter((e) => !inScope(e));

  const visible = data.entries.filter(inScope).filter(
    (e) =>
      !debouncedQuery.trim() ||
      `${e.name} ${e.city ?? ''} ${e.clinic ?? ''}`.toLowerCase().includes(debouncedQuery.toLowerCase().trim())
  );

  const centre = visible[0] ? [visible[0].lat, visible[0].lng] : [20, 0];

  const markers = visible
    .filter((e) => e.lat != null)
    .map((e) => ({
      id: `${e.name}-${e.region}`,
      name: e.name,
      address: [e.clinic, e.city, e.state, e.country].filter(Boolean).join(', '),
      lat: e.lat,
      lng: e.lng,
      tags: e.precise ? e.procedures : [...e.procedures, 'approximate'],
    }));

  return (
    <MapShell
      title="LGBTQIA+ Safety Index"
      subtitle="Transgender Surgeries"
      center={openEntry?.lat != null ? [openEntry.lat, openEntry.lng] : centre}
      zoom={openEntry?.precise ? 11 : openEntry ? 6 : visible.length === 1 ? 9 : visible.length ? 5 : 2}
      markers={markers}
      cluster
      detail={openEntry ? <SurgeonDetail entry={openEntry} /> : null}
      search={<SearchField value={query} onChange={setQuery} placeholder="Search Trans Plastic Surgery" />}
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
          min={{ mi: 25, km: 50 }}
          max={{ mi: 1500, km: 2400 }}
        />
      )}

      <div className="group">
        <Switch
          id="centres-only"
          label="Surgery centers only"
          checked={centresOnly}
          onChange={setCentresOnly}
        />
      </div>

      <div className="group">
        <div className="group-label">Procedure</div>
        {PROCEDURES.map((p) => (
          <Switch
            key={p.id}
            id={p.id}
            label={p.label}
            checked={Boolean(selected[p.id])}
            onChange={(v) => setSelected((s) => ({ ...s, [p.id]: v }))}
          />
        ))}
      </div>

      <div className="group-label">
        {loading ? 'Loading...' : `${visible.length} of ${data.total} listed`}
      </div>

      {error && <p className="error">{error}</p>}

      {visible.map((entry) => (
        <article className="card" key={entry.name}>
          <div className="card-head">
            <h3>{entry.name}</h3>
            <span className={`tag status-${STATUS_TONE[entry.status] ?? 'unknown'}`}>{entry.status}</span>
          </div>

          <p className="address">
            {[entry.clinic, entry.city, entry.state, entry.country].filter(Boolean).join(' - ')}
          </p>

          {!entry.precise && (
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Pinned at the regional centre - the wiki lists no address.
            </p>
          )}

          <div className="popup-tags">
            {entry.procedures.map((id) => (
              <span key={id} className="tag">
                {PROCEDURES.find((p) => p.id === id)?.label ?? id}
              </span>
            ))}
          </div>

          {entry.note && <p className="muted" style={{ marginTop: 8 }}>{entry.note}</p>}

          <div className="card-foot">
            <a href={entry.wikiPage} target="_blank" rel="noreferrer">
              Wiki
            </a>
            {entry.website && (
              <a href={entry.website} target="_blank" rel="noreferrer">
                Website
              </a>
            )}
            <Link to={`/surgeries/${entry.slug}`}>View profile</Link>
          </div>
        </article>
      ))}

      {!loading && visible.length === 0 && !error && (
        <p className="empty">
          {procedures.length === 0 ? (
            'Turn on a procedure to see who is listed.'
          ) : elsewhere.length > 0 ? (
            <>
              None here, but {elsewhere.length} listed in{' '}
              {[...new Set(elsewhere.map((e) => e.country))].join(', ')}.
              <br />
              Try <strong>Other countries</strong>.
            </>
          ) : (
            'Nobody listed yet for this procedure.'
          )}
        </p>
      )}

      <p className="muted disclaimer">
        <strong>A directory, not a recommendation.</strong> Transcribed by hand from{' '}
        <a href={data.source} target="_blank" rel="noreferrer">
          r/TransSurgeriesWiki
        </a>
        {data.checkedOn ? `, last checked ${data.checkedOn}` : ''}. Surgeons retire and
        change what they offer, so confirm directly before acting on anything here.
      </p>
    </MapShell>
  );
}
