#!/usr/bin/env bash
# Deploy the bitrise-navigation release to GCS.
#
# Usage: ./bitrise-navigation-deploy.sh <gcp-sa-secret-b64>
#
#   gcp-sa-secret-b64  Base64-encoded GCP service account key JSON
#
# Expects `npm run release:navigation` to have produced the release directory (see
# src/js/bitrise-navigation/release.js, which documents the layout). Nothing needs to be purged from the CDN:
#
#   - content-hashed files are immutable, so they are cached for a year and never overwritten
#   - bootstrap and loader contain no version information and change rarely, so they can be cached for a while
#   - the manifest is the only thing that changes per release; pages request it with a time-bucketed query string
#
# The deploy is idempotent: files that are already identical on the bucket are skipped, so running it on a
# schedule does nothing unless the navigation or the component changed.
set -euo pipefail

GCP_SA_SECRET_B64="${1:?Usage: $0 <gcp-sa-secret-b64>}"

DIST_DIR="${DIST_DIR:-/bitrise/src/dist}"
RELEASE_DIR="${RELEASE_DIR:-${DIST_DIR}/release}"
GCS_BUCKET="gs://web-cdn.bitrise.io"
ASSET_DIR="bitrise-navigation"

CACHE_IMMUTABLE="public, max-age=31536000, immutable"
CACHE_STABLE="public, max-age=3600"
CACHE_MANIFEST="public, max-age=60, stale-while-revalidate=600"

if [ ! -f "${RELEASE_DIR}/${ASSET_DIR}/manifest.json" ]; then
  echo "No release found in ${RELEASE_DIR}. Run 'npm run release:navigation' first." >&2
  exit 1
fi

# --- Authenticate with GCP ---------------------------------------------------

KEY_FILE=$(mktemp)
echo "${GCP_SA_SECRET_B64}" | base64 --decode > "${KEY_FILE}"
gcloud auth activate-service-account --key-file="${KEY_FILE}"
rm -f "${KEY_FILE}"

# --- Helpers -----------------------------------------------------------------

# Upload a file unless the bucket already holds identical content.
upload_if_changed() {
  local file="$1" cache_control="$2"
  printf '  %s ... ' "${file}"
  if gcloud storage cat "${GCS_BUCKET}/${file}" 2>/dev/null | cmp -s - "${RELEASE_DIR}/${file}"; then
    echo "unchanged"
  else
    gcloud storage cp --cache-control="${cache_control}" "${RELEASE_DIR}/${file}" "${GCS_BUCKET}/${file}"
    echo "uploaded"
  fi
}

# --- 1. Hashed assets (never overwritten) -----------------------------------------

echo "Uploading versioned assets:"
for LOCAL_PATH in "${RELEASE_DIR}/${ASSET_DIR}/"*.js; do
  FILE="${ASSET_DIR}/$(basename "${LOCAL_PATH}")"
  if [ "${FILE}" = "${ASSET_DIR}/manifest.js" ]; then
    continue
  fi
  printf '  %s ... ' "${FILE}"
  gcloud storage cp --no-clobber --cache-control="${CACHE_IMMUTABLE}" "${LOCAL_PATH}" "${GCS_BUCKET}/${FILE}"
  echo "done"
done

# --- 2. Stable entry points (generic, rarely change) ----------------------------

echo "Uploading entry points:"
upload_if_changed "bitrise-navigation.js" "${CACHE_STABLE}"
upload_if_changed "bitrise-navigation-loader.js" "${CACHE_STABLE}"

# --- 3. Demo page ----------------------------------------------------------------

if [ -f "${DIST_DIR}/bitrise-navigation.html" ]; then
  echo "Uploading demo page:"
  printf '  bitrise-navigation.html ... '
  gcloud storage cp "${DIST_DIR}/bitrise-navigation.html" "${GCS_BUCKET}/bitrise-navigation.html"
  echo "done"
fi

# --- 4. Manifest last: this is what makes the new version live ------------------------

echo "Publishing manifest:"
upload_if_changed "${ASSET_DIR}/manifest.json" "${CACHE_MANIFEST}"
upload_if_changed "${ASSET_DIR}/manifest.js" "${CACHE_MANIFEST}"

echo "Done."
