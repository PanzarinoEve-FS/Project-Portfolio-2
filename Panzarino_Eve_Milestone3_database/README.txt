LGBTQIA+ Safety Index - database import
Eve Panzarino - Milestone 3

The app reads from a local MongoDB database named "safety-app".
This folder holds every collection it needs, one JSON array per file.

TO IMPORT (macOS / Linux):

    ./import.sh

Or one collection at a time:

    mongoimport --db safety-app --collection surgeons --file surgeons.json --jsonArray --drop

On Windows, run the same mongoimport line for each .json file in this folder.


RUNNING THE APP

    cd server && npm install
    cp .env.example .env        # set JWT_SECRET to any 32+ character string
    npm start                   # API on http://localhost:5050

    cd client && npm install
    npm run dev                 # site on http://localhost:5173

