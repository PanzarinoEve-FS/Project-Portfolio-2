export default function About() {
  return (
    <section className="page prose">
      <h1>About This Project</h1>

      <p>
        Safe Space Finder helps LGBTQIA+ people find local businesses where they will
        be treated well. Every rating it shows is either submitted by a person or
        published by a named organisation - nothing here is scraped, inferred, or
        guessed by an algorithm.
      </p>

      <h2>Where each rating comes from</h2>

      <h3>Community reviews</h3>
      <p>
        The five stats on a business profile - bathroom access, acceptance, staff
        friendliness, safety and overall - come from people who chose to submit them.
        A profile with two reviews is showing you two opinions, not a verdict.
      </p>

      <h3>Documented restrooms</h3>
      <p>
        Restroom locations come from the Refuge Restrooms database, where people log
        gender-neutral and wheelchair-accessible facilities along with directions for
        finding them. When a business shows a restroom nearby, that is a statement
        about <strong>distance only</strong>. The restroom may be in a different
        building, and the measured distance is always shown so you can judge for
        yourself.
      </p>

      <h3>Company scores</h3>
      <p>
        Chain businesses can show a score from the Human Rights Campaign's Corporate
        Equality Index, which rates how companies treat their own LGBTQ+ employees.
        Two limits are worth understanding:
      </p>
      <ul>
        <li>
          It rates the <strong>parent company's workplace policies</strong>, not how
          a particular branch treats customers. A chain scoring 100 says nothing
          about your local store.
        </li>
        <li>
          An <strong>unverified</strong> score means the company did not submit a
          survey that year, so the number is HRC's own assessment rather than a
          confirmed one. Unverified scores are shown in a neutral colour whatever the
          number says.
        </li>
      </ul>

      <h2>Data sources</h2>
      <ul>
        <li>
          <strong>
            <a href="https://get.geojs.io/" target="_blank" rel="noreferrer">GeoJS</a>
          </strong>{' '}
          - approximate location from your IP address, so the map opens somewhere
          useful without a permission prompt. It is city-level and never asks for
          precise device location.
        </li>
        <li>
          <strong>
            <a href="https://nominatim.openstreetmap.org/" target="_blank" rel="noreferrer">
              Nominatim
            </a>
          </strong>{' '}
          (OpenStreetMap) - business names, addresses and nearby search. Requests are
          rate limited and cached on our server to respect its usage policy.
        </li>
        <li>
          <strong>
            <a href="https://www.refugerestrooms.org/" target="_blank" rel="noreferrer">
              Refuge Restrooms
            </a>
          </strong>{' '}
          - community-logged gender-neutral and accessible restrooms, with filters for
          each.
        </li>
        <li>
          <strong>
            <a href="https://www.hrc.org/resources/corporate-equality-index" target="_blank" rel="noreferrer">
              HRC Corporate Equality Index
            </a>
          </strong>{' '}
          - company workplace-policy scores. HRC publishes no API, so these are
          transcribed by hand and each entry links back to its source page.
        </li>
        <li>
          <strong>MongoDB</strong> - the community reviews collected by this app. A
          business is only stored once somebody reviews it.
        </li>
      </ul>

      <h2>What this project deliberately does not do</h2>
      <p>
        An earlier plan for this app was to scrape reviews and infer how conservative
        or accepting a business was likely to be. That was dropped on purpose.
        Publishing algorithmic guesses about the politics of named real businesses is
        both unreliable and a legal risk, and it is not something a user could check.
      </p>
      <p>
        Everything shown here can be traced to a source: a person who wrote a review,
        a restroom somebody logged, or a rating an organisation published under its
        own name.
      </p>

      <h2>Built with</h2>
      <ul>
        <li>
          <strong>React Leaflet</strong> - interactive maps on free OpenStreetMap
          tiles, with no API key or billing account
        </li>
        <li>
          <strong>Recharts</strong> - the radar chart of community ratings on each
          business profile
        </li>
        <li><strong>React Router</strong> - client-side routing across six views</li>
        <li>
          <strong>Express + Mongoose</strong> - API proxying, rate limiting, caching
          and data storage
        </li>
        <li><strong>Vite</strong> - build tool and development server</li>
      </ul>
    </section>
  );
}
