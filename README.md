
# 💻 Project & Portfolio II

# Project Name: WDP2 Portfolio Project

### Eve Panzarino (jhankins)

🆔 &nbsp; #0004828216

📪 &nbsp; jnhankins@student.fullsail.edu


![Degree Program](https://img.shields.io/badge/Degree-Web%20Development-orange?logo=gnometerminal)
<br>
![Class Name](https://img.shields.io/badge/Class-Project%20and%20Portfolio%20II-orange?logo=react)



<br>

<br>

## 🚀 &nbsp; Running This Project

Everything the app displays is committed to this repo, so there is no database to
obtain separately. `npm run seed` loads it all into a local MongoDB.

**You need:** [Node.js](https://nodejs.org) 20 or newer, and MongoDB running locally
(`brew services start mongodb-community`, or MongoDB Compass, or Docker with
`docker run -d -p 27017:27017 mongo`).

### 1. Server

```bash
cd server
npm install
cp .env.example .env
```

Open `.env` and set `JWT_SECRET` to any string of 32+ characters — the server
refuses to start without one. To generate a good one:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Then load the data and start it:

```bash
npm run seed
npm start
```

The API runs on **http://localhost:5050**. (Port 5000 is taken by macOS AirPlay.)

### 2. Client

In a second terminal:

```bash
cd client
npm install
npm run dev
```

The site runs on **http://localhost:5173**.

### What `npm run seed` loads

| Collection | Rows | What it is |
| --- | --- | --- |
| `surgeons` | 1,596 | Trans surgeons and surgery centers, with the procedures each one is documented as performing |
| `cei` | 112 | HRC Corporate Equality Index scores, covering 272 storefront brand names |
| `reviews` | 69 | LGBTQIA+ reviews of named businesses — 46 researched by hand, 23 read from Google Maps and classified by this project |
| `zipscores` | 145 | Business Safety Scores per ZIP, for the Heatmap |
| `zctas` | 145 | Census ZIP boundary shapes for the scored ZIPs |
| `sweepbusinesses` | 9,809 | Cached OpenStreetMap business sweep the scoring runs on |
| `surgeonreviews` | 1 | A community rating left on a directory entry |

One collection is deliberately **not** in the repo: `users`, which holds password
hashes and email addresses. Register an account in the app to try the login and
favorites features. Community ratings are seeded under a display name rather than
a real one.

### Tests

The search filters are covered by a Jest suite that needs no database — it runs
the real route against the committed directory file:

```bash
cd server
npm test
```

### Optional extras

The seed ships Census boundary shapes only for the 145 ZIPs that carry a score,
which is everything the Heatmap draws. Typing any other ZIP into a search box
still works — it just resolves through OpenStreetMap instead. To load all 33,791
US ZIP shapes (downloads ~60 MB from the Census Bureau, stores ~97 MB):

```bash
npm run seed:zctas
```

Re-scoring the ZIPs from the cached business sweep:

```bash
npm run score:zips
```

Some features call public APIs that need no key (OpenStreetMap, Nominatim,
Overpass, Refuge Restrooms). The Reddit-sourced surgeon pages need free API
credentials in `.env`; without them the rest of the site is unaffected.

<br>

## 📢 &nbsp; Milestone Check-Ins

Each week I will summarize my milestone activity and progress by writing a stand-up. A stand-up is meant to be a succinct update on how things are going.  
Use the prompts below as a guide on what to write about.    
For each Milestone #2-4, you should use all 4 icons.   

⚙️ Overview - What I worked on this past week
<br>
🌵 Challenges - What problems did I have & how I'm addressing them

<br>
🏆 Accomplishments - What is something I "leveled up" on this week

<br>
🔮 Next Steps - What I plan to prioritize and do next


<br>

### Milestone 1

For this milestone you will have created a wireframe prototype in Figma.   
Post your link here, so you have easy access to it.

[Figma Link](https://www.figma.com/design/PTKjniE6Ftt6kcxaLnMq9y/LGBTQIA--Safe-Search?node-id=7-1308&t=osXndGdI5rSKF4YG-1)

<br>

### Milestone 2
⚙️ Overview - What I worked on this past week
I gathered Surgeon data and CEI(Corporate Equality Index) Data into mongodb. I polished the review system and have finished the surgeon search.
I Fixed some CSS Bugs. I Organized my codebase. I added Navigation. I added Apple Design System reusable components. I created Profiles for businesses, aswell as well as doctors and Surgery Centers.

<br>
🌵 Challenges - What problems did I have & how I'm addressing them
The biggest issues I've been having is that the apis have limits that ultimately limit the range of the search.
I am addressing this by looking up the limits of the apis and shortening the range.
There's a CSS bug in Safari that was causing me problems with my layout. I fixed it but it took me probably like 30 minutes to get it looking right.
I was accidentally working on main instead of dev and had a problem where I believe I had to rebase my branch. I have a hard time with GitHub branches because I know I can't make mistakes like this in a production environment.
I have been sloppy with how I have been doing things and need to recenter. I feel rushed for time a lot.
<br>
🏆 Accomplishments - What is something I "leveled up" on this week
My biggest accomplishment is in collecting my own data. 
I wanted to make this project before but never felt properly inspired until now. This even motivates me and makes my old projects seem like smaller tasks than I originally anticipated. 
I am part of the trans surgeries subreddit and I made a searchable database of surgeons and trans surgery centers.
<br>
🔮 Next Steps - What I plan to prioritize and do next
I received feedback saying my page needs more views. I can add a profile and login system where users can save surgery centers doctors and business to their profile.
Every Page on my site is a profile of some kind. 
I have the business profiles, surgeon/surgery center profiles, and I will add the login and user profiles. 
I created issues that define my next steps to complete Milestone 2.


<br>
<br>

Please discuss the following:  
#### Page #1   
- Name: LGBTQIA+ Safety Index Search  
- Purpose: Search business, see gender neutral bathrooms nearby   

#### Page #2   
- Name: Surgeon/Surgery Center Search
- Purpose: Search transgender surgeons and surgery centers in local mongodb database.

#### Page #3   
- Name: Services
- Purpose: Different filters related to gender affirming care

#### Page #4   
- Name: Profile Page / Login / Register
- Purpose: Account system mongodb. save surgeons surgery centers and businesses to your profile for easy access.




#### Remember that creating a project board, issues, and milestones is 50% of your grade!     
If you are having trouble, contact your instructor ASAP, you might need to be part of the ePortoflio group to have better access.




<br>

### Milestone 3
⚙️ Overview - This week I turned the project into something that runs end to end on
someone else's machine. I finished researching the surgeon directory, so all 1,596
entries have been checked by hand and 723 of them now carry the procedures a source
actually documents them performing. I fixed the surgery center filter, added the
favorites system to the profile page, committed every collection the app needs into
the repo with a one-command seed, and wrote a Jest suite covering the search filters.
<br>
🌵 Challenges - Three bugs were only findable by digging. Saved surgery centers never
appeared on the profile page: the grouping code asked for `kind: 'center'` while the
model, the API and every saved row used `'centre'`, so the filter silently matched
nothing. I have since renamed the British spelling to American everywhere except a
French clinic name and the OpenStreetMap tag values, which genuinely use `centre`.
Filtering centers by top surgery returned almost nothing, because center rows carry
their own tags from the source wiki and those were never updated as I researched the
individual surgeons. And `routes/surgeons.js` contained four stray NUL bytes, which
made `grep` treat it as a binary file and skip it, so it stayed invisible during a
search until I checked the file byte by byte.
<br>
🏆 Accomplishments - I leveled up on testing. Rather than writing tests that assert
today's numbers, each one recomputes what the answer should be from the source data,
so they test the filtering logic instead of freezing a snapshot. I then checked the
suite was worth having by deliberately breaking the route three ways and confirming
it failed each time. I also got the whole database into the repo: the Census boundary
file is 97 MB, but the heatmap only ever asks for ZIPs that carry a score, so shipping
those 145 shapes is 0.2 MB and the map still draws exactly the same.
<br>
🔮 Next Steps - Styling polish for Milestone 4. I want to add a category for
gender affirming hysterectomy, since 17 surgeons in the directory perform it and the
schema currently has nowhere to record it. I also want to correct the heatmap caption,
which credits Google reviews when documented restrooms are most of the score, and
extend the tests to the client side filters.

<br>

Please discuss the following:
#### API    
- Link to the API that is used in your code: [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap geocoding). The app also calls [Overpass](https://overpass-api.de/), [Refuge Restrooms](https://www.refugerestrooms.org/api/docs/), [GeoJS](https://get.geojs.io/) and the [Reddit API](https://www.reddit.com/dev/api/).
- Reason you chose the API: it is free, needs no key, and returns JSON. The project has to turn a typed ZIP code or address into coordinates so a search can measure distance from it, and Nominatim does that over open data rather than a commercial map service. Its usage policy caps callers at one request a second and asks for an identifying User-Agent, which the code respects.
- Where in your code did you use it? `server/lib/nominatim.js` holds a single shared queue and cache so every caller obeys the one request per second limit. `server/routes/geo.js` uses it for the `/api/geo/place` lookup behind the search boxes on the Find Places and Surgeon Search pages, and `server/routes/places.js` uses it for business lookups.

#### 1st Library
- Link to the library: [Leaflet](https://leafletjs.com/) via [React Leaflet](https://react-leaflet.js.org/)
- Link to library tutorial that you made already: **<!-- paste the link to your 1.4 Exercise 01 tutorial here -->**
- Reason you chose this library: the whole project is about where things are, so almost every page needed a real map rather than a static image. Leaflet is open source, works with OpenStreetMap tiles without an API key or billing account, and React Leaflet gives it a component API that fits the rest of the app.
- Where in your code is it used? `client/src/components/Map/MapView.jsx` is the shared map used by the business, services and surgeon pages. `client/src/components/Map/ZipLayer.jsx` draws the ZIP code choropleth on the heatmap from Census boundary shapes. `client/src/components/Map/ReviewMarker.jsx` and `UserLocationMarker.jsx` place the individual pins.

#### 2nd Library    
- Link to the library: [Recharts](https://recharts.org/)
- Reason you chose this library: a score on its own does not tell you much, so the app needed to show how a place compares with its neighbours. Recharts draws charts as React components, which meant the bars could be made clickable and wired into the same selection state as the map.
- Where in your code is it used? `client/src/components/Map/ZipChart.jsx` draws one bar per scored ZIP on the heatmap, and clicking a bar selects that ZIP on the map. `client/src/components/Map/BusinessChart.jsx` compares a single business against others in its ZIP, and `client/src/components/Apple Design Elements/RatingsChart.jsx` shows the rating breakdown on a profile.

#### Persistent Data    
- Discuss if you have used MongoDB or Local Storage: MongoDB, through Mongoose, with an Express backend in `server/`.
- How was it used in your code? Eight collections back the app. The directory of surgeons and surgery centers, the HRC Corporate Equality Index scores, the researched and collected reviews, the Census ZIP shapes and their Business Safety Scores are all read from Mongo rather than fetched live, because the public APIs they came from are rate limited. Accounts are stored with a bcrypt password hash and a session kept in an httpOnly cookie, and each user's saved places are an embedded array on their own document. Everything except the user accounts is committed to the repo as JSON and loaded with `npm run seed`, so the app is not empty on a fresh clone.
- Where in your code is it used? The schemas are in `server/models/` (`Surgeon`, `CEI`, `Review`, `SurgeonReview`, `Zcta`, `ZipScore`, `Business`, `User`). The routes that read and write them are in `server/routes/`, and the loaders are in `server/scripts/`. Saving a place writes to `server/routes/favorites.js`, which pushes onto the `favorites` array on the signed-in user.

<br>

### Milestone 4
⚙️ Overview - Write overview here.
<br>
🌵 Challenges - Write challenges here.
<br>
🏆 Accomplishments - Write Accomplishments here.
<br>
🔮 Next Steps - Write your next steps here.

<br>

Please discuss the following:  
#### Changes
- Discuss any changes or updates that you have made to your site since Milestone #3.

#### Styling
- Discuss the process you used to style your page.

#### Link To Overview Video
- Once it is created, put the link to your overview video of your site here.

<br>
<br>
<hr/>

# Project Overview

### Your project will use the MERN Tech Stack and must include the following:

-   A Git Repo, with a master, dev, and milestone branches
-   Readme File that explains your project and tracks your milestones
-   A React Front End
-   React Routing with  _at least_  4 different views/pages
    -   Dashboard/Main
    -   User/Settings
    -   Search
    -   Detail Page
-   Node/Express Backend
-   A Mongo DB Element OR Local Storage for persistent data
-   Connect to at least 1 free API
-   The project must use at least 2 different libraries, not including React itself
    -   One of these libraries you will create a tutorial for in Exercise 01
-   It should look visually appealing and must be easy for the end-user to use and understand. You may use Tailwind or any other front-end library/framework.

**Milestone #1 (Due: Monday of Week 2)**

-   Decide on your topic and theme for your project.
    -   Check out the Free API sites for some ideas of an API that you can utilize
        -   [Apipheny](https://apipheny.io/free-api/)  
            
        -   [Mixed Analytics](https://mixedanalytics.com/blog/list-actually-free-open-no-auth-needed-apis/)  
            
        -   [I Am Sajan](https://iamsajan.com/free-api-without-an-api-key/)  
            
-   Functional Spec that explains the scope of the work and the deadlines that must be met.  
    
-   Create a Wireframe Prototype in Figma that will help non-tech people understand your idea.
    -   Keep in mind that a lot of your bosses will need only high-level concepts and will not be concerned with the actual code. The code is your job.

**Milestone #2 **(Due: Monday of Week 3)****

-   Create your Git Repo using the provided link, which will clone over a blank repo.
-   Start to code your project.
    -   I will not give you a step-by-step guide for this.
    -   At this point, you must use your skills and build it out yourself.
-   Along the way, if you get stuck, you may reach out to the lab assistants, but remember this is YOUR portfolio project, and troubleshooting your own code is a part of this process.
-   By Milestone #2, I am going to be checking that you have a React app that can compile without error and that you have your navigation up and running.

**Milestone #3 **(Due: Monday of Week 4)****

-   By this point, you should have a functional prototype of your project. It might not look pretty yet, but that is what the final week is for.
-   Your Git Repo should have a number of significant commits pushed to it.

**Milestone #4 **(Due: Sunday of Week 4)****

-   Your completed project will be due.
-   You must create a (3 to 10) minute long video that goes through your project, what you did this month, and the technologies that you used to get it working.
    -   Remember it is your job to sell your work and really show it off.
