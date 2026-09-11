import MapView from './MapView.jsx';
import PrideFlag from '../Assets/PrideFlag.jsx';
import MapNav from '../Navigation/MapNav.jsx';

// The layout every map view shares: a full-bleed map 
// sidebar floating over it, the way an iPadOS split view works.
export default function MapShell({
  title,
  subtitle,
  center,
  zoom = 12,
  markers = [],
  cluster = false,
  search = null,
  detail = null,
  children,
}) {
  return (
    <div className="app">
      <div className="map-layer">
        <MapView center={center} zoom={zoom} markers={markers} cluster={cluster} />
      </div>

      <MapNav />

      <aside className="sidebar">
        {/* The blur lives on its own layer so it cannot scroll or spill past
            the rounded corner.
            
            This CSS was the bain of my existence because safari has a bug.
            */}
        <div className="sidebar-glass" aria-hidden="true" />

        <div className="sidebar-body">
          <PrideFlag />

          <MapNav className="sidebar-nav" />

          <div className="sidebar-title">
            {title}
            <small>{subtitle}</small>
          </div>

          {search && <div className="search-dock">{search}</div>}

          <div className="sidebar-scroll">{children}</div>
        </div>
      </aside>

      {/* Profile column, sitting between the sidebar and the map. */}
      {detail && <div className="detail">{detail}</div>}
    </div>
  );
}
