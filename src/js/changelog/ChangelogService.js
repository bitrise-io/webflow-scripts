import ChangelogTopic from './ChangelogTopic';

class ChangelogService {
  /**
   * @param {string} apiBase
   * @param {string} fallbackApiBase
   */
  constructor(apiBase, fallbackApiBase) {
    /** @type {string} */
    this.apiBase = apiBase;
    /** @type {string} */
    this.fallbackApiBase = fallbackApiBase;
    /** @type {string|null} */
    this.currentApiBase = null;
  }

  /**
   * Checks the availability of the primary and fallback API bases, and returns the one that is reachable.
   * @throws {Error} if neither the primary nor the fallback API base is reachable
   * @returns {Promise<string>} the reachable API base URL
   */
  async getApiBase() {
    if (this.currentApiBase !== null) {
      return this.currentApiBase;
    }
    try {
      const response = await fetch(`${this.apiBase}/changelog-proxy`);
      if (response.ok) {
        this.currentApiBase = this.apiBase;
      }
    } catch (error) {
      this.currentApiBase = this.fallbackApiBase;
    }
    if (this.currentApiBase === null) {
      const response = await fetch(`${this.fallbackApiBase}/changelog-proxy`);
      if (response.ok) {
        this.currentApiBase = this.fallbackApiBase;
      }
    }
    return this.currentApiBase;
  }

  /**
   * @param {string} changelogUrl
   * @returns {Promise<ChangelogTopic[]>}
   */
  async loadTopics(changelogUrl) {
    const apiBase = await this.getApiBase();
    const d = new Date().toISOString().split(':');
    const cacheBuster = `${d[0].replace(/[^\d]/g, '')}${Math.floor(d[1] / 15)}`;
    const url = `${apiBase + changelogUrl}?_=${cacheBuster}`;
    const response = await fetch(url);
    const json = await response.json();
    return json.topic_list.topics.map((data) => new ChangelogTopic(data));
  }

  /**
   * @param {string} topicSlugId
   * @returns {Promise<ChangelogTopic>}
   */
  async loadTopic(topicSlugId) {
    const apiBase = await this.getApiBase();
    if (topicSlugId.match(/rm-\d+/)) {
      const url = `${apiBase}/changelog.json`;
      const response = await fetch(url);
      const json = await response.json();
      const topicJson = json.topic_list.topics.filter(
        (topic) => topic.id === 0 && topic.slug === topicSlugId.replace(/\/0/, ''),
      );
      if (topicJson.length > 0) {
        return new ChangelogTopic(topicJson[0]);
      }
    }

    const url = `${apiBase}/changelog/api/t/${topicSlugId}.json`;
    const response = await fetch(url);
    const json = await response.json();
    if (!json.errors || json.errors.length === 0) {
      return new ChangelogTopic(json);
    }

    throw new Error(`Topic not found: ${topicSlugId}`);
  }
}

export default ChangelogService;
