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


## Libraries

The assignment requires at least 2 libraries besides React. These are the two:

| Library | Purpose | Where it is used |
|---|---|---|
| [React Leaflet](https://react-leaflet.js.org/) | Interactive maps using free OpenStreetMap tiles. No API key or billing required, unlike Google Maps or Mapbox. Pairs directly with Nominatim, since both are OpenStreetMap projects. | `client/src/components/MapView.jsx` |
| [Recharts](https://recharts.org/) | Radar charts that turn the five rating stats into a visual profile instead of a list of numbers. | `client/src/components/RatingsChart.jsx` |

### Tutorial library (Exercise 01): React Leaflet 
1.4 Exercise 01: Library Tutorial — [Click to watch video](https://fullsailedu-my.sharepoint.com/:v:/g/personal/jnhankins_student_fullsail_edu/IQBidfMZHvIQT43gJQyiedVsARpBz6SnAPKa3BTxSKI10Go?e=EZOFxK&nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbE1vZGUiOiJtaXMiLCJyZWZlcnJhbFZpZXciOiJwb3N0cm9sbC1jb3B5bGluayIsInJlZmVycmFsUGxheWJhY2tTZXNzaW9uSWQiOiJiY2M5YTY3My1hOTQ3LTQwODItYWI0ZS02MTQwMGJhZTJjYTIifX0%3D)

React Leaflet: Library — [Click to go to their website with more documentation](https://react-leaflet.js.org).



### Supporting libraries

| Library | Purpose |
|---|---|
| [React Router](https://reactrouter.com/) | Client-side routing across the 6 views |
| [Express](https://expressjs.com/) | Backend API and third-party API proxy |
| [Mongoose](https://mongoosejs.com/) | MongoDB schemas and the computed rating averages |
| [Vite](https://vite.dev/) | Build tool and dev server (replaces Create React App, which React deprecated in 2025) |

## Tech Stack

MERN: **M**ongoDB, **E**xpress, **R**eact, **N**ode.

## Milestone 2

Milestones occur at the end of each week to help you keep on track with finishing your main project on time


**Objectives**

Successful completion of this milestone will show that you can…

- Maintain, manage, and iterate code within a project repository
- Update documentation using markdown syntax
- Manage projects using modern development practices
- Utilize React Routing to create a working navigation

**Overview**

This assignment outlines the requirements for the next milestone. A milestone marks a key point in project development.

To finish up your work for the week, complete the project requirements outlined below.



Take the following steps to complete this week's milestone:

**Project**

Code

- Create a repository based on this Starting Repo Link:
- This will give your instructors, lab assistants, and yourself permission to see your files as you progress.
Remember to create a dev branch to work in.
- Update the Readme file with your information. We will be using this file to track your progress as well.
- Clone the starting repo to your machine and create a new React project.
- Be sure to include a gitIgnore file, so the Node files & modules are not uploaded.
- If you are planning on using Mongo, remember to include allow the .env file to be uploaded, without it I will not be able to run your project.
- You should already have the idea & theme for your main project, based on the prototype that you created for **Milestone #1**

For this week, you must create a working shell of your program.

**For Milestone #2 your program must contain:**

- A working/compilable React project.
- It must contain at least 4 pages/views. These should have already been created and developed in your Figma prototype.
- Search Businesses > Business Profile
- Search Surgery Centers > Surgery Center Profile
- Search Services > Services Profile

These pages must contain at least enough content to make sense. If you have time, it would be better to put in real content at this stage to save you time for Week 3.

React Routing must be setup and working to all pages.

Any other links must also be functional.

**ReadMe File**

Update your Readme file with your progress so far.

**Objectives**

Successful completion of this milestone will show that you can…

- Maintain, manage, and iterate code within a project repository
I started with the APIs and integrated them into the search functionality and using the Leaflet Maps Library to render the maps in the app. I figure I can figure out something for the Recharts library. Another thing I was thinking of is creating a heat map for the safest areas of town for an LGBTQIA+ person.
- Update documentation using markdown syntax
Doing so.
- Manage projects using modern development practices
I used a design system in figma and recreated an apple maps interface using the design system.
- Utilize React Routing to create a working navigation
I have react router installed and I have the following pages at the moment:
- Search > Home > Business search LGBTQIA+ Safety
- Surgeries > Need to download all the data from the r/trans_surgeries
- Services > Need to ask friends for reccomendations and log those businesses as LGBTQIA+ friendly
- About

**Overview**

I had to refactor some things. I do not believe I currently have enough knowledge on the trans masculine experience and I'm making this app focus on trans feminine as that's what I know. One of my best friends is a trans man and maybe he can help me expand the search function to include all trans surgeries.
I am not sure if my filters on the services and surgeries pages are final. I was worried I was behind this week then read the specs for Milestone 2 and I was like woah I think my app meets those requirements already. 
