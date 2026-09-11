import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getRestrooms, getCEI } from '../../api/client.js';
import { useProfile } from '../../hooks/useProfile.js';
import { findNearestRestroom } from '../../utils/distance.js';
import { matchCEI } from '../../utils/cei.js';
import ProfileHero from './ProfileHero.jsx';
import BathroomAccess from './BathroomAccess.jsx';
import CEIScore from './CEIScore.jsx';
import ReviewSection from '../Reviews/ReviewSection.jsx';

export default function PlaceDetail({ osmId, backTo = '/', backLabel = 'Back to search' }) {
  const profile = useProfile(osmId);
  const { place, loading, error, reviewCount } = profile;
  const [nearestRestroom, setNearestRestroom] = useState(null);
  const [cei, setCei] = useState({ entries: [], maxScore: 100 });

  useEffect(() => {
    getCEI().then(setCei).catch(() => {});
  }, []);

  useEffect(() => {
    if (!place) return undefined;
    let cancelled = false;

    getRestrooms({ lat: place.lat, lng: place.lng, perPage: 40 })
      .then((rooms) => !cancelled && setNearestRestroom(findNearestRestroom(place, rooms)))
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [place]);

  if (loading) return <p className="muted">Loading...</p>;

  if (error && !place) {
    return (
      <>
        <p className="error">{error}</p>
        <Link to={backTo}>{backLabel}</Link>
      </>
    );
  }

  if (!place) return null;

  const ceiMatch = matchCEI(place.name, cei.entries);

  return (
    <>
      <Link className="detail-back" to={backTo}>
        {backLabel}
      </Link>

      <ProfileHero place={place} />

      {ceiMatch && (
        <div className="panel">
          <h2>Company Rating</h2>
          <CEIScore match={ceiMatch} maxScore={cei.maxScore} detailed />
        </div>
      )}

      <div className="panel bathroom-panel">
        <BathroomAccess
          averages={place.averages}
          reviewCount={reviewCount}
          nearestRestroom={nearestRestroom}
        />
      </div>

      <ReviewSection
        place={place}
        form={profile.form}
        setForm={profile.setForm}
        saving={profile.saving}
        error={profile.error}
        onSubmit={profile.submitReview}
        reviewCount={reviewCount}
      />
    </>
  );
}
