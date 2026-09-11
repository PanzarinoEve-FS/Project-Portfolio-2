import { Routes, Route, Link, useLocation } from 'react-router-dom';

import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import Restrooms from './pages/Restrooms.jsx';
import Surgeries from './pages/Surgeries.jsx';
import Services from './pages/Services.jsx';
import SurgeryProfile from './pages/SurgeryProfile.jsx';
import SurgeonProfile from './pages/SurgeonProfile.jsx';
import Directory from './pages/Directory.jsx';
import About from './pages/About.jsx';

// Home owns the whole viewport: a full-bleed map with the sidebar floating
// over it, the way an iPadOS split view works. Every other route is a
// standard scrolling page under a Liquid Glass toolbar.
export default function App() {
  const { pathname } = useLocation();
  // Every view that draws its own sidebar owns the full viewport, so the
  // toolbar is only for the remaining standalone pages.
  const isMapView =
    ['/', '/surgeries', '/services', '/about'].includes(pathname) ||
    pathname.startsWith('/surgeries/') ||
    pathname.startsWith('/business/') ||
    pathname.startsWith('/surgery/') ||
    pathname.startsWith('/service/') ||
    pathname.startsWith('/surgeon/');

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
        <Route path="/surgeries/:slug" element={<Surgeries />} />
        <Route path="/services" element={<Services />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/business/:osmId" element={<Home />} />
        <Route path="/surgery/:osmId" element={<SurgeryProfile />} />
        <Route path="/service/:osmId" element={<Services />} />
        <Route path="/surgeon/:slug" element={<SurgeonProfile />} />
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
