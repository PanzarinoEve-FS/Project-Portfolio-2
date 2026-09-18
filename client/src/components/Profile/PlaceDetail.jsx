import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getRestrooms, getCEI, getWebReviews } from '../../api/client.js';
import { useProfile } from '../../hooks/useProfile.js';
import { findNearestRestroom } from '../../utils/distance.js';
import { matchCEI } from '../../utils/cei.js';
import ProfileHero from './ProfileHero.jsx';
import BathroomAccess from './BathroomAccess.jsx';
import CEIScore from './CEIScore.jsx';
import ReviewSection from '../Reviews/ReviewSection.jsx';
import WebReviewSection from '../Reviews/WebReviewSection.jsx';

// Reviews name their business in prose, so they are matched on the name as
// well as the id: a place found by the sweep and one found by research do not
// always carry the same OpenStreetMap id.
// "BookBurn Cafe & Social" on the map is "BookBurn Cafe and Social" in a
// write-up, so the ampersand is spelled out before the punctuation goes.
const norm = (value = '') =>
  value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();

const reviewsFor = (reviews, place, osmId) => {
  const name = norm(place?.name);
  return reviews.filter(
    (review) => review.osmId === osmId || (name && norm(review.business) === name)
  );
};

// A place profile that renders inside a list view's detail column
// opening one never unmounts the search results behind it.
export default function PlaceDetail({ osmId, backTo = '/', backLabel = 'Back to search', onClose = null }) {
  const profile = useProfile(osmId);
  const { place, loading, error, reviewCount } = profile;
  const [nearestRestroom, setNearestRestroom] = useState(null);
  const [cei, setCei] = useState({ entries: [], maxScore: 100 });
  const [webReviews, setWebReviews] = useState([]);

  useEffect(() => {
    getCEI().then(setCei).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    getWebReviews()
      .then((data) => !cancelled && setWebReviews(data.reviews ?? []))
      .catch(() => {});

    return () => {
      cancelled = true;
    };
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
      {onClose ? (
        <button type="button" className="detail-back" onClick={onClose}>
          Close
        </button>
      ) : (
        <Link className="detail-back" to={backTo}>
          {backLabel}
        </Link>
      )}

      <ProfileHero place={place} />

      {ceiMatch && (
        <div className="panel">
          <h2>Company Rating</h2>
          <CEIScore match={ceiMatch} maxScore={cei.maxScore} detailed />
        </div>
      )}

      <WebReviewSection reviews={reviewsFor(webReviews, place, osmId)} />

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
