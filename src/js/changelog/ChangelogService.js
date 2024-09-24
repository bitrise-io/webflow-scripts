import ChangelogTopic from './ChangelogTopic';

class ChangelogService {
  /**
   * @param {string} apiBase
   */
  constructor(apiBase) {
    /** @type {string} */
    this.apiBase = apiBase;
  }

  /**
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

  /**
   * @param {string} topicSlugId
   * @returns {Promise<ChangelogTopic>}
   */
  async loadTopic(topicSlugId) {
    const url = `${this.apiBase}/changelog/api/t/${topicSlugId}.json`;
    const response = await fetch(url);
    const json = await response.json();
    return new ChangelogTopic(json);
  }
}

export default ChangelogService;
