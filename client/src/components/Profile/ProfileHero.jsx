import FavoriteButton from '../Assets/FavoriteButton.jsx';

// Name, phone and address, as in the wireframe's profile header.
export default function ProfileHero({ place }) {
  return (
    <header className="profile-hero">
      <FavoriteButton
        kind="business"
        refId={place.osmId}
        name={place.name}
        subtitle={place.address}
        size={26}
        className="favorite-corner"
      />

      <h1>{place.name}</h1>

      {place.phone && (
        <p className="profile-contact">
          <a href={`tel:${place.phone.replace(/[^\d+]/g, '')}`}>{place.phone}</a>
        </p>
      )}

      {place.address && <p className="address">{place.address}</p>}

      {place.website && (
        <p className="profile-contact">
          <a href={place.website} target="_blank" rel="noreferrer">
            Visit website
          </a>
        </p>
      )}
    </header>
  );
}
