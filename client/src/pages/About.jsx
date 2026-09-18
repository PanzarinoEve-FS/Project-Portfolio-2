import { useEffect, useState } from "react";

import { getMyLocation } from "../api/client.js";
import MapShell from "../components/Map/MapShell.jsx";
import { useIsCompact } from "../hooks/useMediaQuery.js";

export default function About() {
  const [location, setLocation] = useState(null);
  const isCompact = useIsCompact();

  useEffect(() => {
    getMyLocation()
      .then(setLocation)
      .catch(() => {});
  }, []);

  const body = (
    <div className="prose panel-prose">
      <h2>Where each rating comes from</h2>

      <h3>Business Safety Score</h3>
      <p>
        Every ZIP on the heatmap is scored only from what people reported about
        the places inside it. A chain's corporate record can shade an individual
        business's own score, but it never colours a region: a national brand
        rating says nothing about the neighbourhood around one of its stores.
      </p>
      <p>
        The colours on the heatmap are driven by reports, not by paperwork. What
        somebody said about being treated at a place counts for three times as
        much as a corporate rating of its parent company, a published article
        about that location counts double, and a documented restroom counts
        double. The company score is the weakest signal there is.
      </p>
      <p>
        A first-hand report of somebody being treated badly weighs more than a
        neutral record, because that is the thing this map exists to surface.
        LGBTQIA+ venues are not marked down for criticism from their own
        patrons: a pride centre is not unsafe because people who went there had
        complaints about it.
      </p>
      <p>
        Grey is the most common colour on the map and it means one thing only --
        not enough local evidence to stand behind a number. As of September
        2026, 93 of the 145 ZIPs with boundaries drawn are grey.{" "}
        <strong>Grey never means unsafe.</strong> Somewhere nobody has reported
        on is a gap in the data, not a warning about the place.
      </p>

      <h3>Web reviews</h3>
      <p>
        Some businesses carry reports found in published articles and posts
        rather than submitted here. Each one keeps a short excerpt in the
        original wording, a summary in this project's own words, and a link to
        the source so you can read it yourself and disagree with the reading.
      </p>
      <p>
        Each is marked as being about a single location or about the company as
        a whole. A company-wide report shades that business's own score but
        never colours the ZIP around it.
      </p>

      <h3>Community reviews</h3>
      <p>
        A review is a star rating out of five, plus two yes/no answers: whether
        the restroom is gender-neutral and whether it is wheelchair accessible.
        Those two are counted, not averaged, so a profile says how many people
        reported each rather than scoring it. All of it comes from people who
        chose to submit it -- a profile with two reviews is showing you two
        opinions, not a verdict.
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

      <h3>Corporate Equality Index</h3>
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
      <p>
        It is also the lightest thing on the scale. A CEI score counts for one
        where a first-hand review counts for three, and an unverified score is
        cut further to 0.6. It can nudge a single business's number and it can
        never colour a ZIP.
      </p>

      <h3>Surgeons and surgery centers</h3>
      <p>
        The directory holds 1,596 entries -- 1,436 surgeons and 160 surgery
        centres -- transcribed by hand from{" "}
        <a
          href="https://www.reddit.com/r/TransSurgeriesWiki/wiki/index/"
          target="_blank"
          rel="noreferrer"
        >
          r/TransSurgeriesWiki
        </a>{" "}
        and from TransHealthcare's list of surgeons performing Trans masculine surgery in
        the USA.
      </p>
      <p>
        Each surgeon is then looked up individually against their own practice's
        pages, hospital profiles, insurance directories and state listings. A
        procedure is tagged only where a source says that surgeon performs it.
        Where the only evidence is a directory listing, the entry says so. Where
        nothing can be found, nothing is tagged and the note records that too,
        rather than implying somebody offers a surgery they may not.
      </p>
      <p>
        A few entries carry no procedure despite doing real gender-affirming
        work: a surgeon whose practice is gender-affirming hysterectomy has no
        matching category here yet. That is a limit of this directory, not of
        their practice.
      </p>
      <p>
        <strong>It is a directory, not a recommendation.</strong> Surgeons
        retire, move and change what they offer, so confirm anything here
        directly before acting on it.
      </p>

      <h2>Finding places</h2>

      <h3>Business search</h3>
      <p>
        The main search looks for gas stations, cafes, restaurants, bars,
        pharmacies and clinics around a point, or all of them at once, out to a
        distance you choose. Two filters narrow it to places with a documented
        gender-neutral or wheelchair-accessible restroom nearby.
      </p>
      <p>
        By default the point is your approximate location from your IP address.
        Type a ZIP code or a place into the search box and the search moves
        there, measuring the range from that point instead; a five-digit ZIP is
        resolved against Census boundaries already stored here, so it costs no
        outside request. A business name is not a place, so typing one searches
        for the business and leaves the map where it is.
      </p>
      <p>
        When nothing matches inside the distance you picked, the search widens
        one step at a time rather than jumping to the widest setting, and says
        so. That is slower, but it lands on the smallest range that actually
        works instead of skipping a clinic ten miles away for one three hundred
        miles out.
      </p>

      <h3>Services search</h3>
      <p>
        A separate search for laser hair removal, eyebrow threading, nail salons
        and massage. These come from OpenStreetMap tags rather than a text
        search, because a text search barely finds category places at all.
      </p>
      <p>
        Laser and threading both sit under the same shop tag as every other
        beauty salon, so those two are narrowed by name afterwards. The whole
        set has to be fetched for that to work, which is why a wide search here
        asks for far more results than it shows.
      </p>

      <h3>Surgeon search</h3>
      <p>
        The surgeon directory is searched differently from the other two,
        because the whole list is already loaded rather than fetched per query.
        Typing a name, a city or a practice filters the list. Procedures are
        picked as switches, split into trans feminine and trans masculine so the
        two lists stay distinct, and the results can be narrowed to surgeons
        only or surgery centres only.
      </p>
      <p>
        The range runs much wider here than on the other searches, out to 1,500
        miles. Surgeons are sparse enough that a nationwide search is the point:
        for many procedures the nearest person is in another state. You can also
        search by state, or by country for surgeons outside the United States.
      </p>
      <p>
        A ZIP code or an address matches no surgeon's name, so typing one is
        treated as a place instead: the search switches to Near me and measures
        the range from there rather than from your IP location. Typing a name
        still filters the list as before.
      </p>
      <p>
        Entries pinned at a regional centre say so. Where the source listed no
        address, the marker is the middle of a region rather than a real
        practice, and the card tells you that instead of implying a precision
        the data does not have.
      </p>

      <h2>Your account</h2>

      <h3>Signing in</h3>
      <p>
        An account stores a username, an email address and optionally a first
        and last name. The password is never stored: only a bcrypt hash of it,
        which is kept out of ordinary database queries and stripped from
        anything sent back to the browser.
      </p>
      <p>
        Signing in sets a cookie the browser sends on its own. It is
        <strong>httpOnly</strong>, so JavaScript on the page can never read it,
        and same-site, so another site cannot use it to act as you. It lasts a
        week. Repeated failed logins from the same address for the same account
        are slowed down, and the server refuses to start at all unless its
        signing secret is a real one.
      </p>

      <h3>Saved places</h3>
      <p>
        Signed in, the heart on a business, a surgeon or a surgery centre saves
        it to your profile, grouped by what it is. Saving the same place twice
        does nothing rather than failing, so a double tap is harmless.
      </p>
      <p>
        A saved place keeps its own name and address rather than a pointer to be
        looked up later. OpenStreetMap is rate limited, and a list that re-fetched
        every entry each time you opened it would be slow and could fail
        outright.
      </p>

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
              href="https://overpass-api.de/"
              target="_blank"
              rel="noreferrer"
            >
              Overpass API
            </a>
          </strong>{" "}
          (OpenStreetMap) - searching for places by tag, which a text search
          cannot do. Queries are capped and cached, and fall back to a mirror
          when the main server is busy.
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
          (OpenStreetMap) - addresses and turning a place name into
          coordinates. Requests are rate limited and cached on our server to
          respect its usage policy.
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
          <strong>
            <a
              href="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html"
              target="_blank"
              rel="noreferrer"
            >
              US Census Bureau
            </a>
          </strong>{" "}
          - the 2020 ZIP Code Tabulation Area boundaries the heatmap is drawn
          on.
        </li>
        <li>
          <strong>MongoDB</strong> - the places swept from OpenStreetMap, the
          reviews and ZIP scores this project has collected, and the surgeon
          directory.
        </li>
      </ul>

      <h2>Built with</h2>
      <ul>
        <li>
          <strong>React Leaflet</strong> - interactive maps on free
          OpenStreetMap tiles, with no API key or billing account
        </li>
        <li>
          <strong>Recharts</strong> - the radar chart of community ratings on a
          business profile, and the bar chart comparing every scored business in
          a ZIP
        </li>
        <li>
          <strong>React Router</strong> - client-side routing, including links
          that open straight to one business, surgeon or ZIP
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
