# Project-Portfolio-2

# 1.2 Overview: Main Portfolio Project
``` Due Mon, Sep 7, 2026 @ 11:59 PM EDT•0% weight ```

## ASSIGNMENT - ACTIVITY


### 1.2 Overview: Main Portfolio Project

```OVERVIEW```

```COMPLETION```

```FEEDBACK```

```This month you will be creating a portfolio project/app that will show off the skills that you have learned up to this point.```

```This project will take a considerable amount of time, so make sure you start early and work on it often. There will be multiple milestones and deadlines that you must achieve along the way.```

####  Project Overview / Scope

Your project will use the MERN Tech Stack and must include the following:

- A Git Repo, with a master, dev, and milestone branches
- Readme File that explains your project and tracks your milestones
- A React Front End
- React Routing with at least 4 different views/pages
- Node/Express Backend
- A Mongo DB Element OR Local Storage for persistent data
- Connect to at least 1 free API that must return JSON data.
- The project must use at least 2 different libraries, not including React itself
- One of these libraries you will create a tutorial for in Exercise 01
- It should look visually appealing and must be easy for the end-user to use and understand. You may use Tailwind or any other front-end library/framework.
Milestone #1 (Due: Monday of Week 2)

Decide on your topic and theme for your project.

LGBTQIA+ Safety App where you can search businesses from a business api database connecting those businesses to street addresses in that api and then an api to get the user's location from their ip address to target results to local businesses.

I was thinking of adding a review scraper that can determine demographic acceptance of LGBTQIA+ individuals.

**Adding business profiles that have stats such as:**
- Bathroom Access 
- Likelihood of Karens
- Likelihood of Conservatives
- Acceptance Rating
- Overall Rating

## APIs

All third-party calls are proxied through the Express server, so the browser only
ever talks to one origin and rate limits stay enforceable.

| Source | Purpose | Our route |
|---|---|---|
| [GeoJS](https://get.geojs.io/) | Approximate location from the visitor's IP | `GET /api/geo/me` |
| [Nominatim](https://nominatim.openstreetmap.org/) | Business search, nearby search, and OSM id lookup | `GET /api/places/search`, `/nearby`, `/lookup` |
| [Refuge Restrooms](https://www.refugerestrooms.org/api/docs/) | Gender-neutral and accessible restrooms (returns lat/lng) | `GET /api/restrooms` |
| [HRC Corporate Equality Index](https://www.hrc.org/resources/corporate-equality-index) | Company LGBTQ+ workplace-policy scores (0-100) | `GET /api/cei` |
| MongoDB (via Mongoose) | Community reviews collected by this app | `GET/POST /api/businesses` |



### Ratings are sourced, never inferred

The original brief proposed scraping reviews to infer "likelihood of
conservatives" and similar stats. That was dropped deliberately: publishing
algorithmic guesses about the politics of named real businesses is unreliable,
legally risky, and impossible for a user to check.

Every number in the app traces to a source - a person who submitted a review, a
restroom somebody logged, or a score an organisation published under its own name.

## Libraries

The assignment requires at least 2 libraries besides React. These are the two:

| Library | Purpose | Where it is used |
|---|---|---|
| [React Leaflet](https://react-leaflet.js.org/) | Interactive maps using free OpenStreetMap tiles. No API key or billing required, unlike Google Maps or Mapbox. Pairs directly with Nominatim, since both are OpenStreetMap projects. | `client/src/components/MapView.jsx` |
| [Recharts](https://recharts.org/) | Radar charts that turn the five rating stats into a visual profile instead of a list of numbers. | `client/src/components/RatingsChart.jsx` |

**Tutorial library (Exercise 01): React Leaflet.** It has a clean four-step
progression to teach -- render a map, add a marker, add a popup, then plot an
array of results from an API -- and one genuine gotcha worth writing up: the
default marker icons break under Vite and have to be re-registered manually.

### Supporting libraries

| Library | Purpose |
|---|---|
| [React Router](https://reactrouter.com/) | Client-side routing across the 6 views |
| [Express](https://expressjs.com/) | Backend API and third-party API proxy |
| [Mongoose](https://mongoosejs.com/) | MongoDB schemas and the computed rating averages |
| [Vite](https://vite.dev/) | Build tool and dev server (replaces Create React App, which React deprecated in 2025) |

## Tech Stack

MERN: **M**ongoDB, **E**xpress, **R**eact, **N**ode.

```
Project-Portfolio-2/
|-- client/                 React front end (Vite)
|   +-- src/
|       |-- api/client.js       All fetch calls to our Express server
|       |-- components/
|       |   |-- MapView.jsx         React Leaflet map + markers
|       |   |-- RatingsChart.jsx    Recharts radar of community ratings
|       |   |-- BathroomAccess.jsx  Shared bathroom-access badge
|       |   |-- CEIScore.jsx        HRC score with its caveats
|       |   |-- BusinessCard.jsx    Result card
|       |   |-- NavBar.jsx, SearchBar.jsx
|       |-- hooks/
|       |   +-- useDebouncedValue.js  Keeps the range slider off the rate limit
|       |-- utils/
|       |   |-- distance.js         Haversine, km/mi conversion, formatting
|       |   +-- cei.js              Brand-name matching against the CEI set
|       +-- pages/              Home, Search, Restrooms, Directory,
|                               BusinessProfile, About
|-- server/                 Node + Express back end
|   |-- config/db.js            Mongoose connection
|   |-- data/cei.json           Hand-transcribed HRC scores + source URLs
|   |-- models/Business.js      Business + review schema, computed averages
|   |-- routes/
|   |   |-- geo.js              GeoJS proxy
|   |   |-- places.js           Nominatim proxy (rate limited + cached)
|   |   |-- restrooms.js        Refuge Restrooms proxy
|   |   |-- cei.js              Serves the Corporate Equality Index seed set
|   |   +-- businesses.js       MongoDB CRUD for community reviews
|   +-- server.js
+-- package.json            Runs both halves together
```

### Routes / Views

| Path | View | What it does |
|---|---|---|
| `/` | Home | Nearby businesses by IP location, with category chips, a km/mi range slider and bathroom filters |
| `/search` | Find Places | Search businesses via Nominatim, plotted on the map |
| `/restrooms` | Restrooms | Refuge Restrooms results with gender-neutral / accessible filters |
| `/directory` | Directory | Every place the community has rated |
| `/business/:osmId` | Profile | Company score, bathroom access, radar chart of ratings, and the review form |
| `/about` | About | Data sources and how ratings work |

## Getting Started

```bash
# 1. Install everything (root, server and client)
npm run install:all

# 2. Set up server environment variables
cp server/.env.example server/.env

# 3. Make sure MongoDB is running
brew services start mongodb-community

# 4. Run the front end and back end together
npm run dev
```

Front end: http://localhost:5173 -- API: http://localhost:5050

> **Note on ports:** the server uses **5050**, not the usual 5000, because
> macOS AirPlay Receiver occupies port 5000 and causes `EADDRINUSE`.

### Troubleshooting

**`502` on every `/api/...` call.** The React app is running but Express is not,
so the Vite proxy has nothing to forward to. Start the back end with
`npm run server`, or use `npm run dev` to run both halves together. Running only
`npm run client` is the usual cause.

### Notes on the APIs

- **Nominatim** limits callers to 1 request per second and requires an
  identifying `User-Agent`. Both are enforced server-side in
  `server/routes/places.js`, which also caches results for 24 hours. Never call
  Nominatim straight from the browser -- that is how you get IP banned. The home
  page range slider is debounced for the same reason: dragging it would
  otherwise queue a backlog of requests against that limit.
- **Refuge Restrooms** has no radius parameter. `by_location` returns results
  closest-first, so `per_page` is the only lever for covering a wider area.
- **A place is only written to MongoDB once somebody reviews it.** Profile pages
  resolve any OpenStreetMap id through `/api/places/lookup`, so a shared profile
  link works even for a business nobody has rated.
- **CEI coverage is only as wide as the seed file.** Chains cluster by category,
  so pharmacies match well and independent restaurants match rarely. Adding a
  company is one entry in `server/data/cei.json`.



Check out the Free API sites for some ideas of an API that you can utilize
Apipheny
Mixed Analytics
I Am Sajan
Functional Spec that explains the scope of the work and the deadlines that must be met.
Create a Wireframe Prototype in Figma that will help non-tech people understand your idea. 
 Keep in mind that a lot of your bosses will need only high-level concepts and will not be concerned with the actual code. The code is your job.
Milestone #2 (Due: Monday of Week 3)

Create your Git Repo using the provided link, which will clone over a blank repo.
Start to code your project. 
I will not give you a step-by-step guide for this. 
At this point, you must use your skills and build it out yourself.
Along the way, if you get stuck, you may reach out to the lab assistants, but remember this is YOUR portfolio project, and troubleshooting your own code is a part of this process.
By Milestone #2, I am going to be checking that you have a React app that can compile without error and that you have your navigation up and running.
Milestone #3 (Due: Monday of Week 4)

By this point, you should have a functional prototype of your project. It might not look pretty yet, but that is what the final week is for.
Your Git Repo should have a number of significant commits pushed to it.
Milestone #4 (Due: Sunday of Week 4)

Your completed project will be due. 
You must create a (3 to 10) minute long video that goes through your project, what you did this month, and the technologies that you used to get it working. 
Remember it is your job to sell your work and really show it off.

Completion


Click on the button below if you have completed this assignment.

MARK AS COMPLETED
Feedback


Send a comment or question to your instructor.
Eve Hankins's profile image
You
Fri Sep 4 @ 05:36 PM EDT
Was thinking of making a website for the queer community, where you can search businesses and it creates company profiles identifying the company's acceptance of LGBTQIA+ people.
Using these APIs at the very least.


Open Data
Leadsbox
71 Million business records in 202 countries
https://leadsbox.biz/?query=lawyers+in+germany

EDIT

