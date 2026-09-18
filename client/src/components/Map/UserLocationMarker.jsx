import { useEffect, useState } from 'react';
import { Circle, CircleMarker, Pane, Tooltip } from 'react-leaflet';

import { getMyLocation } from '../../api/client.js';

// Literal hex: Leaflet writes these into SVG attributes, where CSS variables
// do not resolve. Apple's system blue.
const BLUE = '#007aff';
// A halo wider than this would cover the map without saying much.
const MAX_HALO_M = 2000;

// The "you are here" dot. Uses the browser's location API
export default function UserLocationMarker() {
  const [position, setPosition] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let fellBack = false;
    let watchId = null;

    const approximate = () => {
      if (fellBack) return;
      fellBack = true;
      getMyLocation()
        .then(({ lat, lng }) => {
          if (cancelled || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
          // A precise fix that arrived first wins.
          setPosition((current) => current ?? { lat, lng, precise: false });
        })
        .catch(() => {});
    };

    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        ({ coords }) => {
          if (cancelled) return;
          setPosition({
            lat: coords.latitude,
            lng: coords.longitude,
            accuracy: coords.accuracy,
            precise: true,
          });
        },
        approximate,
        { maximumAge: 60000, timeout: 15000 }
      );
    } else {
      approximate();
    }

    return () => {
      cancelled = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  if (!position) return null;

  const center = [position.lat, position.lng];

  return (

    <Pane name="user-location" style={{ zIndex: 620 }}>
      {position.precise && position.accuracy <= MAX_HALO_M && (
        <Circle
          center={center}
          radius={position.accuracy}
          interactive={false}
          pathOptions={{ stroke: false, fillColor: BLUE, fillOpacity: 0.15 }}
        />
      )}
      <CircleMarker
        center={center}
        radius={8}
        className="user-location"
        pathOptions={
          position.precise
            ? { color: '#ffffff', weight: 3, opacity: 1, fillColor: BLUE, fillOpacity: 1 }
            : { color: BLUE, weight: 3, opacity: 1, fillColor: '#ffffff', fillOpacity: 0.9 }
        }
      >
        <Tooltip direction="top" offset={[0, -10]}>
          {position.precise ? 'You are here' : 'Approximate location, from your internet connection'}
        </Tooltip>
      </CircleMarker>
    </Pane>
  );
}
