import { Routes, Route, Link, useLocation } from 'react-router-dom';

import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import Restrooms from './pages/Restrooms.jsx';
import Surgeries from './pages/Surgeries.jsx';
import Services from './pages/Services.jsx';
import Directory from './pages/Directory.jsx';
import BusinessProfile from './pages/BusinessProfile.jsx';
import About from './pages/About.jsx';

// Home owns the whole viewport: a full-bleed map with the sidebar floating
// over it, the way an iPadOS split view works. Every other route is a
// standard scrolling page under a Liquid Glass toolbar.
export default function App() {
  const { pathname } = useLocation();
  const isMapView = ['/', '/surgeries', '/services'].includes(pathname);

  return (
    <>
      {!isMapView && (
        <header className="toolbar glass">
          <Link to="/" className="toolbar-back">
            <svg width="12" height="20" viewBox="0 0 12 20" fill="none" aria-hidden="true">
              <path
                d="M10 1 2 10l8 9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Map
          </Link>

          <nav className="chips">
            <Link className="chip" to="/surgeries">Surgeries</Link>
            <Link className="chip" to="/services">Services</Link>
            <Link className="chip" to="/about">About</Link>
          </nav>
        </header>
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/restrooms" element={<Restrooms />} />
        <Route path="/surgeries" element={<Surgeries />} />
        <Route path="/services" element={<Services />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/business/:osmId" element={<BusinessProfile />} />
        <Route path="/about" element={<About />} />
        <Route
          path="*"
          element={
            <section className="page">
              <h1>Page not found</h1>
              <Link to="/">Back to the map</Link>
            </section>
          }
        />
      </Routes>
    </>
  );
}
