

class TopicListItem
{
  constructor(data) {
    this.data = data;
  }

  /** @returns {number} */
  get id() {
    return this.data.id;
  }

  /** @returns {string} */
  get fancyTitle() {
    return this.data.fancy_title.replace(/:([^\s]+):/ig, '<img width="20" height="20" src="https://emoji.discourse-cdn.com/twitter/$1.png?v=12" title="$1" alt="$1" class="emoji" style="display: inline; vertical-align: sub;">');
  }

  /** @returns {Date} */
  get createdAt() {
    return new Date(this.data.created_at);
  }

  /** @returns {string} */
  get slug() {
    return this.data.slug;
  }

  /** @returns {string} */
  get webflowUrl() {
    return `/changelog/${this.slug}/${this.id}`;
  }

  /** @returns {boolean} */
  get isPinned() {
    return !!this.data.pinned;
  }
}

class ChangelogService
{
  constructor() {
    this.changelogUrl = "/changelog.json";

    /** @type {TopicListItem[]} */
    this.topics = [];

    this.nextPage = 0;
    this.currentPage = -1;
  }

  /** @returns {Promise<TopicListItem[]>} */
  async loadMore() {
    if (this.isMore) {
      const url = this.changelogUrl + "?page=" + this.nextPage;
      const response = await fetch(url);
      const json = await response.json();
  
      this.currentPage = this.nextPage;
  
      if (json.topic_list.more_topics_url) {
        const moreTopicsUrlMatch = json.topic_list.more_topics_url.match(/page=(\d+)/);
        this.nextPage = parseInt(moreTopicsUrlMatch[1]);
      }
  
      json.topic_list.topics.forEach(data => {
        this.topics.push(new TopicListItem(data));
      });
    }

    return this.topics;
  }

  /** @returns {boolean} */
  get isMore() {
    return this.nextPage > this.currentPage;
  }
}

class ChangelogList
{
  constructor(list, loadMoreButton) {
    /** @type {HTMLUListElement} */
    this.list = list;

    /** @type {HTMLAnchorElement} */
    this.loadMoreButton = loadMoreButton;

    /** @type {HTMLLIElement[]} */
    this.listItems = [];

    /** @type {HTMLLIElement} */
    this.unreadListItemTemplate = this.list.querySelector("#changelog-unread-template");
    this.unreadListItemTemplate.id = "";
    this.unreadListItemTemplate.remove();

    /** @type {HTMLLIElement} */
    this.readListItemTemplate = this.list.querySelector("#changelog-read-template");
    this.readListItemTemplate.id = "";
    this.readListItemTemplate.remove();
  }


  /**
   * @param {TopicListItem} topic 
   * @param {boolean} isUnread
   * @returns {HTMLLIElement}
   */
  renderListItem(topic, isUnread = false) {
    const listItem = (isUnread ? this.unreadListItemTemplate : this.readListItemTemplate).cloneNode(true);
    listItem.querySelector(".changelog-timestamp").innerHTML = `[${topic.createdAt.toLocaleDateString()}]`;
    listItem.querySelector(".changelog-title").innerHTML = topic.fancyTitle;
    listItem.querySelector("a").href = topic.webflowUrl;
    return listItem;
  }

  /**
   * @param {TopicListItem[]} topics 
   * @param {boolean} isMore
   */
  render(topics, isMore) {
    for (let topic of topics) {
      if (!this.listItems[topic.id]) {
        const listItem = this.renderListItem(topic);
        this.listItems[topic.id] = listItem;
        this.list.append(listItem);
      }
    }
    if (!isMore) {
      this.loadMoreButton.remove();
    }
  }
}

const changelogService = new ChangelogService();

const changelogList = new ChangelogList(
  document.getElementById("changelog-list"),
  document.getElementById("changelog-load-more-button")
);
changelogList.loadMoreButton.addEventListener('click', () => {
  changelogList.loadMoreButton.disabled = true;
  changelogList.loadMoreButton.innerHTML = "Loading...";
  changelogService.loadMore().then(topics => {
    changelogList.render(topics, changelogService.isMore);
    changelogList.loadMoreButton.disabled = false;
    changelogList.loadMoreButton.innerHTML = "Load more...";
  });
});

changelogList.loadMoreButton.disabled = true;
changelogList.loadMoreButton.innerHTML = "Loading...";
changelogService.loadMore().then(topics => {
  changelogList.render(topics, changelogService.isMore);
  changelogList.loadMoreButton.disabled = false;
  changelogList.loadMoreButton.innerHTML = "Load more...";
});


