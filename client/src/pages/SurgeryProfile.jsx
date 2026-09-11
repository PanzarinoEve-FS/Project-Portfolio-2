import { useParams, Link } from 'react-router-dom';

import { useProfile } from '../hooks/useProfile.js';
import { useIsCompact } from '../hooks/useMediaQuery.js';
import MapShell from '../components/Map/MapShell.jsx';
import ProfileHero from '../components/Profile/ProfileHero.jsx';
import ReviewSection from '../components/Reviews/ReviewSection.jsx';

export default function SurgeryProfile() {
  const { osmId } = useParams();
  const isCompact = useIsCompact();
  const profile = useProfile(osmId);
  const { place, loading, error } = profile;

  const shell = (body) => (
    <MapShell
      title="LGBTQIA+ Safety Index"
      subtitle="Surgery Center"
      center={place ? [place.lat, place.lng] : [28.5978, -81.3024]}
      zoom={place ? 16 : 12}
      markers={place ? [{ id: place.osmId, name: place.name, lat: place.lat, lng: place.lng }] : []}
      detail={isCompact ? null : body}
    >
      <Link className="chip" to="/surgeries">
        Back to surgeries
      </Link>

      {isCompact && body}
    </MapShell>
  );

  if (error && !place) {
    return shell(
      <>
        <p className="error">{error}</p>
        <Link to="/surgeries">Back to surgeries</Link>
      </>
    );
  }

  if (loading) return shell(<p className="muted">Loading...</p>);
  if (!place) return null;

  return shell(
    <>
      <ProfileHero place={place} />

      <ReviewSection
        place={place}
        form={profile.form}
        setForm={profile.setForm}
        saving={profile.saving}
        error={profile.error}
        onSubmit={profile.submitReview}
        reviewCount={profile.reviewCount}
      />

      <p className="muted disclaimer">
        <strong>Not a verified provider.</strong> OpenStreetMap records that a place is
        a clinic or hospital, never which procedures it performs. Confirm directly with
        the provider or a directory such as WPATH.
      </p>
    </>
  );
}
