import MapView from './MapView.jsx';
import PrideFlag from './PrideFlag.jsx';
import MapNav from './MapNav.jsx';

// The layout every map view shares: a full-bleed map with the sidebar
// floating over it, the way an iPadOS split view works.
export default function MapShell({
  title,
  subtitle,
  center,
  zoom = 12,
  markers = [],
  search = null,
  children,
}) {
  return (
    <div className="app">
      <div className="map-layer">
        <MapView center={center} zoom={zoom} markers={markers} />
      </div>

      <MapNav />

      <aside className="sidebar">
        {/* The blur lives on its own layer so it cannot scroll or spill past
            the rounded corner. */}
        <div className="sidebar-glass" aria-hidden="true" />

        <div className="sidebar-body">
          <PrideFlag />

          <div className="sidebar-title">
            {title}
            <small>{subtitle}</small>
          </div>

          {search && <div className="search-dock">{search}</div>}

          <div className="sidebar-scroll">{children}</div>
        </div>
      </aside>
    </div>
  );
}
