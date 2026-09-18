import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

import { getSurgeon } from '../api/client.js';
import { useIsCompact } from '../hooks/useMediaQuery.js';
import MapShell from '../components/Map/MapShell.jsx';

const LABEL = {
  srs: 'Bottom Surgery (SRS)',
  ffs: 'Facial Feminization (FFS)',
  breasts: 'Top Surgery',
  vfs: 'Voice Feminization (VFS)',
};

export default function SurgeonProfile() {
  const { slug } = useParams();
  const isCompact = useIsCompact();
  const [entry, setEntry] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getSurgeon(slug)
      .then((d) => !cancelled && setEntry(d))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const isCentre = entry && entry.kind !== 'surgeon';

  const shell = (body) => (
    <MapShell
      title="LGBTQIA+ Safety Index"
      subtitle={isCentre ? 'Surgery Center' : 'Surgeon'}
      center={entry?.lat != null ? [entry.lat, entry.lng] : [20, 0]}
      zoom={entry?.precise ? 12 : entry ? 6 : 2}
      markers={
        entry?.lat != null
          ? [{ id: entry.name, name: entry.name, address: [entry.city, entry.state, entry.country].filter(Boolean).join(', '), lat: entry.lat, lng: entry.lng }]
          : []
      }
      detail={isCompact ? null : body}
    >
      <Link className="chip" to="/surgeries">
        Back to surgeries
      </Link>
      {isCompact && body}
    </MapShell>
  );

  if (loading) return shell(<p className="muted">Loading...</p>);

  if (error || !entry) {
    return shell(
      <>
        <p className="error">{error || 'Not found'}</p>
        <Link to="/surgeries">Back to surgeries</Link>
      </>
    );
  }

  return shell(
    <>
      <header className="profile-hero">
        <h1>{entry.name}</h1>
        <p className="address">
          {[entry.clinic, entry.city, entry.state, entry.country].filter(Boolean).join(', ')}
        </p>
        {entry.specialty && <p className="profile-contact">{entry.specialty}</p>}
        {entry.website && (
          <p className="profile-contact">
            <a href={entry.website} target="_blank" rel="noreferrer">
              Visit website
            </a>
          </p>
        )}
      </header>

      <div className="panel">
        <h2>Listed for</h2>
        <div className="popup-tags">
          {entry.procedures.map((id) => (
            <span key={id} className="tag">
              {LABEL[id] ?? id}
            </span>
          ))}
          <span className={`tag status-${{ active: 'good', unclear: 'mixed', retired: 'poor' }[entry.status] ?? 'unknown'}`}>
            {entry.status}
          </span>
        </div>
        {entry.note && <p className="muted" style={{ marginTop: 8 }}>{entry.note}</p>}
      </div>

      {isCentre ? (
        <div className="panel">
          <h2>Doctors listed here</h2>
          {entry.colleagues.length === 0 ? (
            <p className="empty">The wiki does not record which doctors work at this centre.</p>
          ) : (
            entry.colleagues.map((c) => (
              <div key={c.slug} className="review">
                <div className="card-head">
                  <Link to={`/surgeon/${c.slug}`}>{c.name}</Link>
                  <span className={`tag status-${{ active: 'good', unclear: 'mixed', retired: 'poor' }[c.status] ?? 'unknown'}`}>
                    {c.status}
                  </span>
                </div>
                {c.note && <p className="muted">{c.note}</p>}
              </div>
            ))
          )}
        </div>
      ) : (
        entry.clinic && (
          <div className="panel">
            <h2>Practices at</h2>
            <Link to={`/surgeon/${entry.clinic.toLowerCase().replace(/\s+/g, '-')}`}>{entry.clinic}</Link>
            {entry.colleagues.length > 0 && (
              <p className="muted" style={{ marginTop: 8 }}>
                Alongside {entry.colleagues.map((c) => c.name).join(', ')}
              </p>
            )}
          </div>
        )
      )}

      <div className="panel">
        <h2>Where this comes from</h2>
        <p className="muted">
          Transcribed from{' '}
          <a href={entry.wikiPage} target="_blank" rel="noreferrer">
            r/TransSurgeriesWiki
          </a>
          {entry.checkedOn ? `, last checked ${entry.checkedOn}` : ''}.
          {entry.locationSource === 'NPI Registry' && (
            <>
              {' '}Practice location from the{' '}
              <a href={`https://npiregistry.cms.hhs.gov/provider-view/${entry.npi}`} target="_blank" rel="noreferrer">
                NPI Registry
              </a>
              {' '}(NPI {entry.npi}).
            </>
          )}
          {!entry.precise && ' Pinned at the regional centre; no address is listed.'}
        </p>
        <p className="muted" style={{ marginTop: 8 }}>
          <strong>A directory, not a recommendation.</strong> Nothing here confirms which
          procedures this provider currently performs. Confirm directly before acting on it.
        </p>
      </div>
    </>
  );
}
