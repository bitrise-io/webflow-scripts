#!/usr/bin/env bash
# Deploy career maps SSR assets (pages, compact data file and page index) to GCS.
#
# Usage: ./career-maps-ssr-deploy.sh <gcp-sa-secret-b64>
#
#   gcp-sa-secret-b64  Base64-encoded GCP service account key JSON
set -euo pipefail

GCP_SA_SECRET_B64="${1:?Usage: $0 <gcp-sa-secret-b64>}"

DIST_DIR="${DIST_DIR:-/bitrise/src/dist}"
GCS_BUCKET="gs://web-cdn.bitrise.io"
GCS_PREFIX="webflow-ssr"

# --- Authenticate with GCP ---------------------------------------------------

KEY_FILE=$(mktemp)
echo "${GCP_SA_SECRET_B64}" | base64 --decode > "${KEY_FILE}"
gcloud auth activate-service-account --key-file="${KEY_FILE}"
rm -f "${KEY_FILE}"

# --- Upload to GCS -----------------------------------------------------------
# The page index goes last: the worker only serves the pages it lists, so it never points at a page that is not
# uploaded yet.

echo "Uploading careers/maps.html to ${GCS_BUCKET}/${GCS_PREFIX}/careers/:"
gcloud storage cp "${DIST_DIR}/careers/maps.html" "${GCS_BUCKET}/${GCS_PREFIX}/careers/maps.html"
echo "  careers/maps.html ... done"

PAGE_COUNT=$(find "${DIST_DIR}/careers/maps" -name '*.html' | wc -l | tr -d ' ')
echo "Uploading ${PAGE_COUNT} files from dist/careers/maps/ to ${GCS_BUCKET}/${GCS_PREFIX}/careers/maps/:"
gcloud storage cp -r "${DIST_DIR}/careers/maps/"* "${GCS_BUCKET}/${GCS_PREFIX}/careers/maps/"
echo "  done"

echo "Uploading career-maps-data.json to ${GCS_BUCKET}/${GCS_PREFIX}/:"
gcloud storage cp "${DIST_DIR}/career-maps-data.json" "${GCS_BUCKET}/${GCS_PREFIX}/career-maps-data.json"
echo "  career-maps-data.json ... done"

echo "Uploading career-maps-pages.json to ${GCS_BUCKET}/${GCS_PREFIX}/:"
gcloud storage cp "${DIST_DIR}/career-maps-pages.json" "${GCS_BUCKET}/${GCS_PREFIX}/career-maps-pages.json"
echo "  career-maps-pages.json ... done"

echo "Done."
