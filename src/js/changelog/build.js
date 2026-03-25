/* eslint-disable no-await-in-loop */
const fs = require('fs');
const { generateChangelogRSS } = require('./generate-rss');


/**
 *
 * @param {number} time
 * @returns {Promise<void>}
 */
function delay(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

/**
 * @typedef {{
 *  id: number,
 *  title: string,
 *  fancy_title: string,
 *  slug: string,
 *  created_at: string,
 *  pinned: boolean,
 *  tags: string[],
 * }} DiscourseTopic
 */

/**
 * @typedef {{
 *  topic_list: {
 *    topics: DiscourseTopic[],
 *  },
 * }} DiscourseCategoryResponse
 */

/**
 *
 * @param {string} category
 * @returns {Promise<DiscourseTopic[]>}
 */
async function fetchCategory(category) {
  const topics = [];

  const skipTag = 'skip-changelog';

  const skipTopics = [24064, 24172, 24514, 24668, 24786, 24951];

  process.stdout.write(`Fetching ${category}: `);

  let nextPage = 0;
  while (nextPage !== null) {
    await delay(500);

    const url = `https://discuss.bitrise.io${category}?page=${nextPage}`;
    const response = await fetch(url);

    /** @type {DiscourseCategoryResponse} */
    const json = await response.json();
    process.stdout.write('.');

    json.topic_list.topics.forEach((topic) => {
      const topicTags = topic.tags.map((tag) => (typeof tag === 'object' ? tag.slug : tag));
      if (topic.pinned) return; // skip if pinned
      if (skipTag && topicTags.includes(skipTag)) return; // skip if has skip tag
      if (skipTopics.includes(topic.id)) return; // skip if in skip id list

      topics.push({
        id: topic.id,
        title: topic.title,
        fancy_title: topic.fancy_title,
        slug: topic.slug,
        created_at: topic.created_at,
        tags: topicTags,
      });
    });

    nextPage = null;
    if (json.topic_list.more_topics_url) {
      const moreTopicsUrlMatch = json.topic_list.more_topics_url.match(/page=(\d+)/);
      nextPage = parseInt(moreTopicsUrlMatch[1], 10);
    }
  }

  process.stdout.write(` \x1b[32mdone\x1b[0m (${topics.length})\n`);

  return topics;
}

/**
 * @typedef {{
 *  gcsKey: string,
 *  title: string,
 *  slugPrefix: string,
 * }} RMApiConfig
 */

/** @type {RMApiConfig[]} */
const RM_API_CONFIGS = [
  {
    gcsKey: 'changelog_v1.json',
    title: 'Release Management API V1 Update',
    slugPrefix: 'rm-v1',
  },
  {
    gcsKey: 'changelog_v2_apps.json',
    title: 'Release Management API V2 - Apps Update',
    slugPrefix: 'rm-v2-apps',
  },
  {
    gcsKey: 'changelog_v2_store_releases.json',
    title: 'Release Management API V2 - Store Releases Update',
    slugPrefix: 'rm-v2-store',
  },
  {
    gcsKey: 'changelog_v2_code_push.json',
    title: 'Release Management API V2 - CodePush Update',
    slugPrefix: 'rm-v2-cp',
  },
  {
    gcsKey: 'changelog_v2_build_distributions.json',
    title: 'Release Management API V2 - Build Distributions Update',
    slugPrefix: 'rm-v2-bd',
  },
];

const GCS_BASE_URL = 'https://storage.googleapis.com/bitrise-release-management-public-api-docs';

/**
 * Fetch one RM API changelog file and convert its entries to topics.
 * Only entries that are actually present in the file produce topics —
 * no entry is created if the file is empty or missing.
 *
 * @param {RMApiConfig} config
 * @returns {Promise<DiscourseTopic[]>}
 */
async function fetchRMApiChangelog(config) {
  const url = `${GCS_BASE_URL}/${config.gcsKey}`;
  process.stdout.write(`Fetching ${config.title}: `);

  const response = await fetch(url);
  if (!response.ok) {
    process.stdout.write(` \x1b[33mskipped (${response.status})\x1b[0m\n`);
    return [];
  }

  const entries = await response.json();
  if (!Array.isArray(entries) || entries.length === 0) {
    process.stdout.write(` \x1b[33mskipped (empty)\x1b[0m\n`);
    return [];
  }

  const topics = entries.map((changelogEntry) => {
    const dateTime = Object.keys(changelogEntry)[0];
    return {
      id: 0,
      title: config.title,
      fancy_title: config.title,
      slug: `${config.slugPrefix}-${dateTime.replaceAll(/[- :]/g, '')}`,
      created_at: dateTime.replace(/(\d{2})-(\d{2})-(\d{4})(.*)/, '$3-$2-$1$4'),
      tags: ['api-update'],
      changelog: changelogEntry[dateTime],
    };
  });

  process.stdout.write(` \x1b[32mdone\x1b[0m (${topics.length})\n`);
  return topics;
}

/** @returns {void} */
async function buildChangelog() {
  /** @type {DiscourseTopic[]} */
  const topics = [];

  // const productUpdatesTopics = await fetchCategory("/c/product-updates/42.json");
  // productUpdatesTopics.forEach((topic) => topics.push(topic));

  const changelogTopics = await fetchCategory('/c/changelog/6.json');
  changelogTopics.forEach((topic) => topics.push(topic));

  for (const config of RM_API_CONFIGS) {
    const apiTopics = await fetchRMApiChangelog(config);
    apiTopics.forEach((topic) => topics.push(topic));
  }

  topics.sort((a, b) => {
    const aDate = new Date(a.created_at);
    const bDate = new Date(b.created_at);
    return bDate.getTime() - aDate.getTime(); // reverse
  });

  const filename = './changelog.json';
  process.stdout.write(`Writing ${filename}: `);
  await fs.promises.writeFile(
    filename,
    JSON.stringify({
      timestamp: new Date(),
      topic_list: {
        topics,
      },
    }),
  );

  const filenameLatest = './changelog_latest.json';
  process.stdout.write(`Writing ${filenameLatest}: `);
  await fs.promises.writeFile(
    filenameLatest,
    JSON.stringify({
      timestamp: new Date(),
      topic_list: {
        topics: topics.slice(0, 20),
      },
    }),
  );

  process.stdout.write(` \x1b[32mdone\x1b[0m\n`);

  process.stdout.write('Generating RSS feed: ');
  await generateChangelogRSS(filename, './changelog.xml');
  process.stdout.write(` \x1b[32mdone\x1b[0m\n`);
}

buildChangelog();
