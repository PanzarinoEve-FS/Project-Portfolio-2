import { Routes, Route, Link } from 'react-router-dom';

import NavBar from './components/NavBar.jsx';
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import Restrooms from './pages/Restrooms.jsx';
import Directory from './pages/Directory.jsx';
import BusinessProfile from './pages/BusinessProfile.jsx';
import About from './pages/About.jsx';

export default function App() {
  return (
    <div className="app">
      <NavBar />

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/restrooms" element={<Restrooms />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/business/:osmId" element={<BusinessProfile />} />
          <Route path="/about" element={<About />} />
          <Route
            path="*"
            element={
              <section className="page">
                <h1>Page not found</h1>
                <Link to="/">Go home</Link>
              </section>
            }
          />
        </Routes>
      </main>

      <footer className="footer">
        Map data &copy; OpenStreetMap contributors &middot; Restroom data from Refuge Restrooms
      </footer>
    </div>
  );
}
