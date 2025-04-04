/* eslint-disable no-await-in-loop */
const fs = require('fs');

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
      if (topic.pinned) return; // skip if pinned
      if (skipTag && topic.tags.includes(skipTag)) return; // skip if has skip tag
      if (skipTopics.includes(topic.id)) return; // skip if in skip id list

      topics.push({
        id: topic.id,
        title: topic.title,
        fancy_title: topic.fancy_title,
        slug: topic.slug,
        created_at: topic.created_at,
        tags: topic.tags,
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

/** @returns {void} */
async function buildChangelog() {
  /** @type {DiscourseTopic[]} */
  const topics = [];

  // const productUpdatesTopics = await fetchCategory("/c/product-updates/42.json");
  // productUpdatesTopics.forEach((topic) => topics.push(topic));

  const changelogTopics = await fetchCategory('/c/changelog/6.json');
  changelogTopics.forEach((topic) => topics.push(topic));

  process.stdout.write(`Fetching Release Management Public API Changelog: `);
  const releaseManagementPublicApiChangelog = await fetch(
    'https://storage.googleapis.com/bitrise-release-management-public-api-docs/changelog.json',
  );
  (await releaseManagementPublicApiChangelog.json()).forEach((changelogLine) => {
    const createdAt = Object.keys(changelogLine)[0];
    topics.push({
      id: 0,
      title: `Release Management Public API Update`,
      fancy_title: `Release Management Public API Update`,
      slug: `rm-${createdAt.replaceAll(/[- :]/g, '')}`,
      created_at: createdAt.replace(/(\d{2})-(\d{2})-(\d{4})(.*)/, '$3-$2-$1$4'),
      tags: ['api-update'],
      changelog: changelogLine[createdAt],
    });
  });
  process.stdout.write(` \x1b[32mdone\x1b[0m (${topics.length})\n`);

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
}

buildChangelog();
