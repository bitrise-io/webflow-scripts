import ChangelogTopic from "./ChangelogTopic";

class ChangelogService
{
  /**
   * @param {string} apiBase 
   */
  constructor(apiBase) {
    /** @type {string} */
    this.apiBase = apiBase;

    /** @type {string} */
    this.changelogUrl = "/changelog.json";

    /** @type {ChangelogTopic[]} */
    this.topics = [];

    /** @type {number} */
    this.nextPage = 0;
    /** @type {number} */
    this.currentPage = -1;
  }

  /** @returns {Promise<ChangelogTopic[]>} */
  async loadMore() {
    if (this.isMore) {
      const url = this.apiBase + this.changelogUrl + "?page=" + this.nextPage;
      const response = await fetch(url);
      const json = await response.json();
  
      this.currentPage = this.nextPage;
  
      if (json.topic_list.more_topics_url) {
        const moreTopicsUrlMatch = json.topic_list.more_topics_url.match(/page=(\d+)/);
        this.nextPage = parseInt(moreTopicsUrlMatch[1]);
      }
  
      json.topic_list.topics.forEach(data => {
        this.topics.push(new ChangelogTopic(data));
      });
    }

    return this.topics;
  }

  /** @returns {boolean} */
  get isMore() {
    return this.nextPage > this.currentPage;
  }

  /**
   * @param {string} topicSlugId 
   * @returns {Promise<ChangelogTopic>}
   */
  async loadTopic(topicSlugId) {
    const url = this.apiBase + `/changelog/${topicSlugId}.json`;
    const response = await fetch(url);
    const data = await response.json();
    console.log(data);
    return new ChangelogTopic(data);
  }
}

export default ChangelogService;