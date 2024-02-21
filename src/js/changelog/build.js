const fs = require('fs');

/**
 * 
 * @param {number} time 
 * @returns {Promise<void>}
 */
function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
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

  process.stdout.write(`Fetching ${category}: `);

  let nextPage = 0;
  while (nextPage !== null) {
    await delay(500);

    const url = "https://discuss.bitrise.io" + category + "?page=" + nextPage;
    const response = await fetch(url);

    /** @type {DiscourseCategoryResponse} */
    const json = await response.json();
    process.stdout.write(".");

    json.topic_list.topics.forEach(topic => {
      if (!topic.pinned) {
        topics.push({
          id: topic.id,
          title: topic.title,
          fancy_title: topic.fancy_title,
          slug: topic.slug,
          created_at: topic.created_at,
          tags: topic.tags,
        });  
      }
    });

    nextPage = null;
    if (json.topic_list.more_topics_url) {
      const moreTopicsUrlMatch = json.topic_list.more_topics_url.match(/page=(\d+)/);
      nextPage = parseInt(moreTopicsUrlMatch[1]);
    }
  }

  process.stdout.write(` \x1b[32mdone\x1b[0m (${topics.length})\n`);

  return topics;
}

/** @returns {void} */
async function buildChangelog() {
  /** @type {DiscourseTopic[]} */
  const topics = [];

  const productUpdatesTopics = await fetchCategory("/c/product-updates/42.json");
  for (let topic of productUpdatesTopics) topics.push(topic);

  const changelogTopics = await fetchCategory("/c/changelog/6.json");
  for (let topic of changelogTopics) topics.push(topic);
  
  topics.sort((a, b) => {
    const aDate = new Date(a.created_at);
    const bDate = new Date(b.created_at);
    return bDate.getTime() - aDate.getTime();  // reverse
  });

  const filename = "./changelog.json";
  process.stdout.write(`Writing ${filename}: `);
  await fs.promises.writeFile(filename, JSON.stringify({
    timestamp: new Date(),
    topic_list: {
      topics: topics,
    },
  }));

  const filename_latest = "./changelog_latest.json";
  process.stdout.write(`Writing ${filename_latest}: `);
  await fs.promises.writeFile(filename_latest, JSON.stringify({
    timestamp: new Date(),
    topic_list: {
      topics: topics.slice(0, 20),
    },
  }));

  process.stdout.write(` \x1b[32mdone\x1b[0m\n`);
}

buildChangelog();