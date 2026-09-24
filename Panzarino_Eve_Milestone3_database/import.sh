#!/bin/bash
# Imports every collection into a local MongoDB database called safety-app.
# Safe to re-run: each collection is replaced, not appended to.
set -e
DB=${1:-safety-app}
cd "$(dirname "$0")"
for c in surgeons cei reviews surgeonreviews zipscores zctas sweepbusinesses; do
  echo "importing $c ..."
  mongoimport --db "$DB" --collection "$c" --file "$c.json" --jsonArray --drop
done
echo
echo "Done. $DB now holds:"
mongosh --quiet --eval 'db.getSiblingDB("'"$DB"'").getCollectionNames().sort().forEach(c => print("  " + c + ": " + db.getSiblingDB("'"$DB"'")[c].countDocuments()))'
