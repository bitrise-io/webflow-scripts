/* eslint-disable no-await-in-loop, no-restricted-syntax */
const fs = require('fs');
const path = require('path');

const DISCOURSE_BASE_URL = 'https://discuss.bitrise.io';
const PUBLISHED_MANIFEST_URL = 'https://web-cdn.bitrise.io/changelog_topics/index.json';
const SNAPSHOT_DIR = './changelog_topics';
const MANIFEST_FILENAME = 'index.json';

// First-post edits do not always bump a topic, so the newest ones are refetched on every run.
const REFRESH_NEWEST_COUNT = 20;
// Keeps a single run short; the initial backfill is spread over several runs, newest topics first.
const MAX_FETCHES_PER_RUN = 600;
const FETCH_DELAY_MS = 500;

/**
 * @typedef {{ topics: {[topicId: string]: string} }} SnapshotManifest topic id -> `bumped_at` of the stored snapshot
 */

/**
 * @param {number} time
 * @returns {Promise<void>}
 */
function delay(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

/**
 * Picks the topics whose snapshot is missing or outdated. Expects `topics` sorted newest first.
 * @param {{ id: number, bumped_at?: string }[]} topics
 * @param {SnapshotManifest} manifest
 * @param {{ refreshNewest?: number, maxFetches?: number }} [options]
 * @returns {{ id: number, bumped_at?: string }[]}
 */
function selectTopicsToFetch(topics, manifest, options = {}) {
  const { refreshNewest = REFRESH_NEWEST_COUNT, maxFetches = MAX_FETCHES_PER_RUN } = options;
  return topics
    .filter((topic) => topic.id !== 0)
    .filter((topic, index) => index < refreshNewest || manifest.topics[topic.id] !== (topic.bumped_at || ''))
    .slice(0, maxFetches);
}

/**
 * Reduces a Discourse topic response to the fields the changelog topic page renders.
 * @param {object} topicJson
 * @returns {object}
 */
function toSnapshot(topicJson) {
  const [firstPost] = topicJson.post_stream.posts;
  return {
    id: topicJson.id,
    title: topicJson.title,
    fancy_title: topicJson.fancy_title,
    slug: topicJson.slug,
    created_at: topicJson.created_at,
    tags: (topicJson.tags || []).map((tag) => (typeof tag === 'object' ? tag.slug : tag)),
    post_stream: {
      posts: [{ id: firstPost.id, cooked: firstPost.cooked }],
    },
  };
}

/**
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<SnapshotManifest>}
 */
async function loadPublishedManifest(fetchImpl) {
  try {
    const response = await fetchImpl(`${PUBLISHED_MANIFEST_URL}?_=${Date.now()}`);
    if (response.ok) {
      const manifest = await response.json();
      if (manifest && typeof manifest.topics === 'object') return manifest;
    }
  } catch (error) {
    process.stdout.write(` (no published manifest: ${error.message}) `);
  }
  return { topics: {} };
}

/**
 * Writes a snapshot file for every new or changed topic, plus the manifest describing all published snapshots.
 * Stops early when Discourse starts rate limiting; the remaining topics are picked up by the next run.
 * @param {{ id: number, bumped_at?: string }[]} topics sorted newest first
 * @param {{ outDir?: string, fetchImpl?: typeof fetch, delayMs?: number, maxFetches?: number }} [options]
 * @returns {Promise<{ written: number, pending: number, rateLimited: boolean }>}
 */
async function buildTopicSnapshots(topics, options = {}) {
  const { outDir = SNAPSHOT_DIR, fetchImpl = fetch, delayMs = FETCH_DELAY_MS, maxFetches } = options;

  const published = await loadPublishedManifest(fetchImpl);
  const currentIds = new Set(topics.map((topic) => String(topic.id)));
  /** @type {SnapshotManifest} */
  const manifest = {
    topics: Object.fromEntries(Object.entries(published.topics).filter(([id]) => currentIds.has(id))),
  };

  const toFetch = selectTopicsToFetch(topics, manifest, { maxFetches });
  await fs.promises.mkdir(outDir, { recursive: true });

  let written = 0;
  let rateLimited = false;
  for (const topic of toFetch) {
    await delay(delayMs);
    try {
      const response = await fetchImpl(`${DISCOURSE_BASE_URL}/t/${topic.id}.json`);
      if (response.status === 429) {
        rateLimited = true;
        break;
      }
      if (response.ok) {
        const snapshot = toSnapshot(await response.json());
        await fs.promises.writeFile(path.join(outDir, `${topic.id}.json`), JSON.stringify(snapshot));
        manifest.topics[topic.id] = topic.bumped_at || '';
        written += 1;
      }
    } catch (error) {
      process.stdout.write(` (topic ${topic.id} skipped: ${error.message}) `);
    }
  }

  await fs.promises.writeFile(path.join(outDir, MANIFEST_FILENAME), JSON.stringify(manifest));

  const pending = topics.filter((topic) => topic.id !== 0 && !(topic.id in manifest.topics)).length;
  return { written, pending, rateLimited };
}

module.exports = { buildTopicSnapshots, selectTopicsToFetch, toSnapshot };
