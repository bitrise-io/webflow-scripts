import ChangelogTopic from "./ChangelogTopic";

class ChangelogService
{
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
    const url = this.apiBase + changelogUrl;
    const response = await fetch(url);
    const json = await response.json();
    console.log(json);
    return json.topic_list.topics.map(data => new ChangelogTopic(data));
  }

  /**
   * @param {string} topicSlugId 
   * @returns {Promise<ChangelogTopic>}
   */
  async loadTopic(topicSlugId) {
    const url = this.apiBase + `/changelog/api/t/${topicSlugId}.json`;
    const response = await fetch(url);
    const json = await response.json();
    return new ChangelogTopic(json);
  }
}

export default ChangelogService;