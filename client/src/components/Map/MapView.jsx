import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';
// Without these the cluster circles render in the DOM but are invisible.
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Leaflet's default marker images break under Vite because the CSS points at relative paths the bundler rewrites. 
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

//MapContainer ignores `center` after the first render 
function Recenter({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center) map.setView(center, zoom ?? map.getZoom());
  }, [center, zoom, map]);

  return null;
}

export default function MapView({ center = [41.8781, -87.6298], zoom = 13, markers = [], cluster = false }) {

  const wrap = (children) =>
    cluster ? (
      <MarkerClusterGroup chunkedLoading spiderfyOnMaxZoom maxClusterRadius={45}>
        {children}
      </MarkerClusterGroup>
    ) : (
      children
    );

  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom zoomControl={false} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Recenter center={center} zoom={zoom} />

      {wrap(
        markers.map((marker) => (
        <Marker key={marker.id} position={[marker.lat, marker.lng]}>
          <Popup>
            <strong>{marker.name}</strong>
            {marker.address && <div className="popup-address">{marker.address}</div>}
            {marker.tags?.length > 0 && (
              <div className="popup-tags">
                {marker.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}
            {marker.osmId && (
              <Link className="popup-link" to={`/business/${encodeURIComponent(marker.osmId)}`}>
                View profile
              </Link>
            )}
          </Popup>
        </Marker>
        ))
      )}
    </MapContainer>
  );
}
