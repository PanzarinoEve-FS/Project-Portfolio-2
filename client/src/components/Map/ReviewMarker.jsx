import { useEffect } from 'react';
import { Marker, Tooltip, useMap } from 'react-leaflet';

// Close enough to see the street the place sits on, without zooming past the
// ZIP shape it belongs to.
const CLOSE_ZOOM = 15;

// The place a web review is about
export default function ReviewMarker({ place, onOpen }) {
  const map = useMap();

  useEffect(() => {
    if (!place) return;
    map.setView([place.lat, place.lng], Math.max(map.getZoom(), CLOSE_ZOOM));
  }, [place, map]);

  if (!place) return null;

  return (
    <Marker position={[place.lat, place.lng]} eventHandlers={{ click: onOpen }}>
      <Tooltip direction="top" offset={[0, -32]}>
        {place.business}
      </Tooltip>
    </Marker>
  );
}
