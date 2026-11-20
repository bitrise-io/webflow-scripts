import ChangelogTopic from './ChangelogTopic';

class ChangelogService {
  /**
   * @param {string} apiBase - where /changelog.json and /changelog_latest.json are served from
   */
  constructor(apiBase) {
    /** @type {string} */
    this.apiBase = apiBase;
  }

  /**
   * Loads one of the topic lists the build job publishes (/changelog_latest.json, /changelog.json).
   * @param {string} changelogUrl
   * @returns {Promise<ChangelogTopic[]>}
   */
  async loadTopics(changelogUrl) {
    const d = new Date().toISOString().split(':');
    const cacheBuster = `${d[0].replace(/[^\d]/g, '')}${Math.floor(d[1] / 15)}`;
    const url = `${this.apiBase + changelogUrl}?_=${cacheBuster}`;
    const response = await fetch(url);
    const json = await response.json();
    return json.topic_list.topics.map((data) => new ChangelogTopic(data));
  }
}

export default ChangelogService;
