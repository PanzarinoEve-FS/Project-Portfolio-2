import { Link } from 'react-router-dom';

import { useState } from 'react';

import SurgeonReviews from '../Reviews/SurgeonReviews.jsx';

const LABEL = {
  srs: 'Bottom Surgery (SRS)',
  ffs: 'Facial Feminization (FFS)',
  breasts: 'Top Surgery',
  vfs: 'Voice Feminization (VFS)',
};

const TONE = { active: 'good', unclear: 'mixed', retired: 'poor' };

export default function SurgeonDetail({ entry }) {
  const isCentre = entry.kind !== 'surgeon';
  const [reviews, setReviews] = useState(entry.reviews ?? []);
  const [average, setAverage] = useState(entry.average ?? null);

  return (
    <>
      <Link className="detail-back" to="/surgeries">
        Back to results
      </Link>

      <header className="profile-hero">
        <h1>{entry.name}</h1>
        {entry.clinic && <p className="profile-clinic">{entry.clinic}</p>}

        {entry.phone && (
          <p className="profile-contact">
            <a href={`tel:${entry.phone.replace(/[^\d+]/g, '')}`}>{entry.phone}</a>
          </p>
        )}

        <p className="address">
          {entry.address || [entry.city, entry.state, entry.country].filter(Boolean).join(', ')}
        </p>

        {entry.specialty && <p className="profile-specialty">{entry.specialty}</p>}
        {entry.website && (
          <a className="website-button" href={entry.website} target="_blank" rel="noreferrer">
            Visit their website
          </a>
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
          <span className={`tag status-${TONE[entry.status] ?? 'unknown'}`}>
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
                  <Link to={`/surgeries/${c.slug}`}>{c.name}</Link>
                  <span className={`tag status-${TONE[c.status] ?? 'unknown'}`}>
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
            <Link to={`/surgeries/${entry.clinicSlug || entry.clinic.toLowerCase().replace(/\s+/g, '-')}`}>
              {entry.clinic}
            </Link>
            {entry.clinicWebsite && (
              <a className="website-button" href={entry.clinicWebsite} target="_blank" rel="noreferrer">
                Visit their website
              </a>
            )}
            {entry.colleagues.length > 0 && (
              <p className="muted" style={{ marginTop: 8 }}>
                Alongside {entry.colleagues.map((c) => c.name).join(', ')}
              </p>
            )}
          </div>
        )
      )}

      {entry.alsoHere?.length > 0 && (
        <div className="panel">
          <h2>Also listed in {entry.place}</h2>
          <p className="muted" style={{ marginBottom: 8, fontSize: 13 }}>
            Recorded in the same place, not necessarily working together.
          </p>
          <div className="popup-tags">
            {entry.alsoHere.map((a) => (
              <Link key={a.slug} className="chip" to={`/surgeries/${a.slug}`}>
                {a.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <SurgeonReviews
        slug={entry.slug}
        reviews={reviews}
        average={average}
        onChange={(r) => {
          setReviews(r.reviews);
          setAverage(r.average);
        }}
      />

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
