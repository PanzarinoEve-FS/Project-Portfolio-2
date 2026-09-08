import { useEffect, useState } from "react";

import { getMyLocation } from "../api/client.js";
import MapShell from "../components/MapShell.jsx";
import { useIsCompact } from "../hooks/useMediaQuery.js";

export default function About() {
  const [location, setLocation] = useState(null);
  const isCompact = useIsCompact();

  useEffect(() => {
    getMyLocation()
      .then(setLocation)
      .catch(() => {});
  }, []);

  // Rendered in the detail column on a wide screen, or inside the sidebar
  // on a phone where that column would cover the panel entirely.
  const body = (
    <div className="prose panel-prose">
      <h2>Where each rating comes from</h2>

      <h3>Trans Surgeries Wiki</h3>
      <p>
        Data Collected off Reddit Testimonials.
        <a
          href="https://www.reddit.com/r/TransSurgeriesWiki/wiki/index/"
          target="_blank"
          rel="noreferrer"
        >
          r/TransSurgeriesWiki
        </a>
      </p>

      <h3>Community reviews</h3>
      <p>
        The five stats on a business profile - bathroom access, acceptance,
        staff friendliness, safety and overall - come from people who chose to
        submit them. A profile with two reviews is showing you two opinions, not
        a verdict.
      </p>

      <h3>Documented restrooms</h3>
      <p>
        Restroom locations come from the Refuge Restrooms database, where people
        log gender-neutral and wheelchair-accessible facilities along with
        directions for finding them. When a business shows a restroom nearby,
        that is a statement about <strong>distance only</strong>. The restroom
        may be in a different building, and the measured distance is always
        shown so you can judge for yourself.
      </p>

      <h3>Company scores</h3>
      <p>
        Chain businesses can show a score from the Human Rights Campaign's
        Corporate Equality Index, which rates how companies treat their own
        LGBTQ+ employees. Two limits are worth understanding:
      </p>
      <ul>
        <li>
          It rates the <strong>parent company's workplace policies</strong>, not
          how a particular branch treats customers. A chain scoring 100 says
          nothing about your local store.
        </li>
        <li>
          An <strong>unverified</strong> score means the company did not submit
          a survey that year, so the number is HRC's own assessment rather than
          a confirmed one. Unverified scores are shown in a neutral colour
          whatever the number says.
        </li>
      </ul>

      <h2>Data sources</h2>
      <ul>
        <li>
          <strong>
            <a href="https://get.geojs.io/" target="_blank" rel="noreferrer">
              GeoJS
            </a>
          </strong>{" "}
          - approximate location from your IP address, so the map opens
          somewhere useful without a permission prompt. It is city-level and
          never asks for precise device location.
        </li>
        <li>
          <strong>
            <a
              href="https://nominatim.openstreetmap.org/"
              target="_blank"
              rel="noreferrer"
            >
              Nominatim
            </a>
          </strong>{" "}
          (OpenStreetMap) - business names, addresses and nearby search.
          Requests are rate limited and cached on our server to respect its
          usage policy.
        </li>
        <li>
          <strong>
            <a
              href="https://www.refugerestrooms.org/"
              target="_blank"
              rel="noreferrer"
            >
              Refuge Restrooms
            </a>
          </strong>{" "}
          - community-logged gender-neutral and accessible restrooms, with
          filters for each.
        </li>
        <li>
          <strong>
            <a
              href="https://www.hrc.org/resources/corporate-equality-index"
              target="_blank"
              rel="noreferrer"
            >
              HRC Corporate Equality Index
            </a>
          </strong>{" "}
          - company workplace-policy scores. HRC publishes no API, so these are
          transcribed by hand and each entry links back to its source page.
        </li>
        <li>
          <strong>MongoDB</strong> - the community reviews collected by this
          app. A business is only stored once somebody reviews it.
        </li>
      </ul>

      <h2>Built with</h2>
      <ul>
        <li>
          <strong>React Leaflet</strong> - interactive maps on free
          OpenStreetMap tiles, with no API key or billing account
        </li>
        <li>
          <strong>Recharts</strong> - the radar chart of community ratings on
          each business profile
        </li>
        <li>
          <strong>React Router</strong> - client-side routing across six views
        </li>
        <li>
          <strong>Express + Mongoose</strong> - API proxying, rate limiting,
          caching and data storage
        </li>
        <li>
          <strong>Vite</strong> - build tool and development server
        </li>
      </ul>
    </div>
  );

  return (
    <MapShell
      title="LGBTQIA+ Safety Index"
      subtitle="About"
      center={location ? [location.lat, location.lng] : [28.5978, -81.3024]}
      zoom={12}
      detail={isCompact ? null : body}
    >
      <div className="prose sidebar-prose">
        <p>
          Safe Space Finder helps LGBTQIA+ people find local businesses where
          they will be treated well.
        </p>
      </div>

      {isCompact && body}
    </MapShell>
  );
}
