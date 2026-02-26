#!/usr/bin/env bash
# Deploy bitrise-navigation assets to GCS and purge Cloudflare cache.
#
# Usage: ./bitrise-navigation-deploy.sh <gcp-sa-secret-b64> <cf-zone-id> <cf-api-token>
#
#   gcp-sa-secret-b64  Base64-encoded GCP service account key JSON
#   cf-zone-id         Cloudflare zone ID for bitrise.io
#   cf-api-token       Cloudflare API token (needs only "Cache Purge" permission)
set -euo pipefail

GCP_SA_SECRET_B64="${1:?Usage: $0 <gcp-sa-secret-b64> <cf-zone-id> <cf-api-token>}"
CF_ZONE_ID="${2:?Usage: $0 <gcp-sa-secret-b64> <cf-zone-id> <cf-api-token>}"
CF_API_TOKEN="${3:?Usage: $0 <gcp-sa-secret-b64> <cf-zone-id> <cf-api-token>}"

DIST_DIR="${DIST_DIR:-/bitrise/src/dist}"
GCS_BUCKET="gs://web-cdn.bitrise.io"
CDN_BASE="https://web-cdn.bitrise.io"

FILES=(
  bitrise-navigation-loader.js
  bitrise-navigation.js
  bitrise-navigation.html
)

# --- Authenticate with GCP ---------------------------------------------------

KEY_FILE=$(mktemp)
echo "${GCP_SA_SECRET_B64}" | base64 --decode > "${KEY_FILE}"
gcloud auth activate-service-account --key-file="${KEY_FILE}"
rm -f "${KEY_FILE}"

# --- Upload to GCS -----------------------------------------------------------

echo "Uploading ${#FILES[@]} files to ${GCS_BUCKET}:"
for FILE in "${FILES[@]}"; do
  printf '  %s ... ' "${FILE}"
  gcloud storage cp "${DIST_DIR}/${FILE}" "${GCS_BUCKET}/${FILE}"
  echo "done"
done

# --- Purge Cloudflare cache ---------------------------------------------------
# Uses the per-URL purge API ("files" key) — only the listed URLs are
# invalidated, NOT the entire zone cache.

CDN_URLS=()
for FILE in "${FILES[@]}"; do
  CDN_URLS+=("${CDN_BASE}/${FILE}")
done

JSON_FILES=$(printf '"%s",' "${CDN_URLS[@]}")
JSON_FILES="[${JSON_FILES%,}]"

echo "Purging Cloudflare cache for ${#CDN_URLS[@]} URLs:"
printf '  %s\n' "${CDN_URLS[@]}"

RESPONSE=$(curl -sf -X POST \
  "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{\"files\":${JSON_FILES}}")

if echo "${RESPONSE}" | grep -q '"success":true'; then
  echo "Cache purged successfully."
else
  echo "Cache purge failed: ${RESPONSE}" >&2
  exit 1
fi
