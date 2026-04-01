#!/usr/bin/env bash
# Deploy integrations SSR assets to GCS.
#
# Usage: ./integrations-ssr-deploy.sh <gcp-sa-secret-b64>
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

echo "Uploading integrations.html to ${GCS_BUCKET}/${GCS_PREFIX}/:"
gcloud storage cp "${DIST_DIR}/integrations.html" "${GCS_BUCKET}/${GCS_PREFIX}/integrations.html"
echo "  integrations.html ... done"

STEP_COUNT=$(find "${DIST_DIR}/integrations" -name '*.html' | wc -l | tr -d ' ')
echo "Uploading ${STEP_COUNT} files from dist/integrations/ to ${GCS_BUCKET}/${GCS_PREFIX}/integrations/:"
gcloud storage cp -r "${DIST_DIR}/integrations/"* "${GCS_BUCKET}/${GCS_PREFIX}/integrations/"
echo "  done"

echo "Done."
