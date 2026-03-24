# Support multiple RM API swagger changelog files in build

## Summary

The Release Management API now publishes changelogs as 5 separate files on GCS (one per API surface) instead of a single `changelog.json`. This PR updates the changelog build to fetch each file independently and produce appropriately titled RSS entries only for the APIs that actually changed.

### Changes

**`build.js`**
- Replaced the single `changelog.json` fetch with an `RM_API_CONFIGS` array covering all 5 files:

  | GCS file | RSS title | Slug prefix |
  |---|---|---|
  | `changelog_v1.json` | Release Management API V1 Update | `rm-v1` |
  | `changelog_v2_apps.json` | Release Management API V2 - Apps Update | `rm-v2-apps` |
  | `changelog_v2_store_releases.json` | Release Management API V2 - Store Releases Update | `rm-v2-store` |
  | `changelog_v2_code_push.json` | Release Management API V2 - CodePush Update | `rm-v2-cp` |
  | `changelog_v2_build_distributions.json` | Release Management API V2 - Build Distributions Update | `rm-v2-bd` |

- Each file is fetched independently — a 404 or empty response is skipped gracefully, so a deploy that only touches one API surface only produces RSS entries for that surface.
- Added a `node-fetch` v2 polyfill for `globalThis.fetch` to support Node < 18.

**`ChangelogTopic.js`**
- Updated slug detection regex from `/rm-\d+/` to `/^rm-/` to match the new prefix-based slug format.

## Test plan

- [ ] Run `npm install && npm run build_changelog` — all 5 RM API files will show as "skipped (404)" until the new GCS files are populated by the first deploy using the updated `generate-and-save-rm-api-changelog` workflow
- [ ] After the first deploy, verify each changed API surface produces a correctly titled entry in `changelog.json` and `changelog.xml`
- [ ] Verify an unchanged API surface produces no new RSS entry
