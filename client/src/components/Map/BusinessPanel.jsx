import PlaceDetail from '../Profile/PlaceDetail.jsx';
import WebReviewSection from '../Reviews/WebReviewSection.jsx';

// A place the sweep found carries a real OpenStreetMap id and has a full
// profile to show. One known only from a review does not, so it gets the same
// layout built from what the review itself recorded.
const REAL_OSM_ID = /^(node|way|relation)-/;

// The business profile, opened from a web review or from a ZIP's list of places.
// It is the same profile the search page opens. 
export default function BusinessPanel({ place, onClose }) {
  if (!place) return null;

  const hasProfile = place.osmId && REAL_OSM_ID.test(place.osmId);

  return (
    <>
      {hasProfile ? (
        <PlaceDetail osmId={place.osmId} onClose={onClose} />
      ) : (
        <>
          <button type="button" className="detail-back" onClick={onClose}>
            Close
          </button>

          <header className="profile-hero">
            <h1>{place.business}</h1>
            {place.address && <p className="address">{place.address}</p>}
          </header>

          <WebReviewSection reviews={place.reviews} />
        </>
      )}
    </>
  );
}
