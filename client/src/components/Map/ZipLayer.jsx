import { useEffect, useRef } from 'react';
import { GeoJSON, useMapEvents } from 'react-leaflet';

// Literal hex: Leaflet writes these into SVG attributes, 
// where CSS variables do not resolve. Same values as the --green, --orange and --red tokens.
export const BANDS = {
  good: { label: 'High', color: '#34c759' },
  mixed: { label: 'Mixed', color: '#ff9500' },
  poor: { label: 'Low', color: '#ff3b30' },
  insufficient: { label: 'Not enough local evidence', color: '#8e8e93' },
};

// Legend text for a band, built from the thresholds the server scored with.
export function bandRange(band, method) {
  const good = method?.bands?.good ?? 95;
  const mixed = method?.bands?.mixed ?? 85;
  if (band === 'good') return `${good}–100`;
  if (band === 'mixed') return `${mixed}–${good - 1}`;
  if (band === 'poor') return `Under ${mixed}`;
  return `Under ${method?.minScored ?? 3} places`;
}

const styleFor = (selected) => (feature) => {
  const { zip, band } = feature.properties;
  const active = zip === selected;
  const grey = band === 'insufficient';

  return {

    color: active ? '#1c1c1e' : grey ? '#636366' : BANDS[band].color,
    weight: active ? 3 : 1.5,
    opacity: 0.9,
    fillColor: BANDS[band].color,
    fillOpacity: grey ? 0.2 : active ? 0.6 : 0.42,
    dashArray: grey ? '5 4' : null,
  };
};

export const describeZip = (zip) =>
  zip.band === 'insufficient'
    ? `${zip.zip} · not enough local evidence`
    : `${zip.zip} · ${zip.score} · ${BANDS[zip.band].label}`;

const viewOf = (map) => {
  const bounds = map.getBounds();
  return {
    zoom: map.getZoom(),
    bbox: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
  };
};

// Reports the visible area whenever the map settles, 
// so the page can load the ZIPs in view, and fits the map to a ZIP when asked.
export function ZipViewport({ onChange, focus }) {
  const map = useMapEvents({ moveend: () => onChange(viewOf(map)) });

  useEffect(() => {
    onChange(viewOf(map));
  }, [map, onChange]);

  useEffect(() => {
    if (!focus?.bbox) return;
    const [w, s, e, n] = focus.bbox;
    map.fitBounds([[s, w], [n, e]], { padding: [48, 48], maxZoom: 13 });
  }, [focus, map]);

  return null;
}

// The ZIP polygons. GeoJSON only reads `data` when it is created
export default function ZipLayer({ data, selected, onSelect }) {
  const layer = useRef(null);
  const shown = useRef(data);

  useEffect(() => {
    if (!layer.current || shown.current === data) return;
    shown.current = data;
    layer.current.clearLayers();
    layer.current.addData(data);
    layer.current.setStyle(styleFor(selected));
  }, [data, selected]);

  return (
    <GeoJSON
      ref={layer}
      data={data}
      style={styleFor(selected)}
      onEachFeature={(feature, path) => {
        path.bindTooltip(describeZip(feature.properties), { sticky: true });
        path.on('click', () => onSelect(feature.properties.zip));
      }}
    />
  );
}
