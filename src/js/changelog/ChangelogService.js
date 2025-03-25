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
    if (topicSlugId.match(/rm-\d+/)) {
      const url = `${this.apiBase}/changelog.json`;
      const response = await fetch(url);
      const json = await response.json();
      const topicJson = json.topic_list.topics.filter(
        (topic) => topic.id === 0 && topic.slug === topicSlugId.replace(/\/0/, ''),
      );
      if (topicJson.length > 0) {
        return new ChangelogTopic(topicJson[0]);
      }
    }

    const url = `${this.apiBase}/changelog/api/t/${topicSlugId}.json`;
    const response = await fetch(url);
    const json = await response.json();
    if (!json.errors || json.errors.length === 0) {
      return new ChangelogTopic(json);
    }

    throw new Error(`Topic not found: ${topicSlugId}`);
  }
}

export default ChangelogService;
