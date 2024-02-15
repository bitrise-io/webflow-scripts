import ChangelogTopic from "./ChangelogTopic";

class ChangelogList
{
  constructor(list) {
    /** @type {HTMLUListElement} */
    this.list = list;

    /** @type {HTMLLIElement} */
    this.unreadListItemTemplate = this.list.querySelector("#changelog-unread-template");
    this.unreadListItemTemplate.id = "";
    this.unreadListItemTemplate.remove();

    /** @type {HTMLLIElement} */
    this.readListItemTemplate = this.list.querySelector("#changelog-read-template");
    this.readListItemTemplate.id = "";
    this.readListItemTemplate.remove();

    /** @type {HTMLLIElement} */
    this.timestampListItemTemplate = this.list.querySelector("#changelog-group-timestamp-template");
    this.timestampListItemTemplate.id = "";
    this.timestampListItemTemplate.remove();

    this.list.innerHTML = "";
    this.list.append(this.renderLoadingTimestampListItem());
    this.list.append(this.renderLoadingListItem());
    this.list.append(this.renderLoadingTimestampListItem());
    this.list.append(this.renderLoadingListItem());
    this.list.append(this.renderLoadingListItem());
  }

  renderLoadingListItem() {
    const listItem = this.readListItemTemplate.cloneNode(true);
    listItem.querySelector(".changelog-timestamp").innerHTML = "<span class='changelog-loading'>Loading</span>";
    listItem.querySelector(".changelog-title").innerHTML = "<span class='changelog-loading'>Loading</span>";
    return listItem;
  }

  renderLoadingTimestampListItem() {
    const timestampListItem = this.readListItemTemplate.cloneNode(true);
    timestampListItem.innerHTML = "<span class='changelog-loading'>Loading</span>";
    return timestampListItem;
  }


  /**
   * @param {ChangelogTopic} topic 
   * @param {boolean} isUnread
   * @returns {HTMLLIElement}
   */
  renderListItem(topic, isUnread = false) {
    const listItem = (isUnread ? this.unreadListItemTemplate : this.readListItemTemplate).cloneNode(true);
    listItem.querySelector(".changelog-timestamp").innerHTML = topic.createdAt.toLocaleDateString();
    listItem.querySelector(".changelog-title").innerHTML = topic.fancyTitle;
    listItem.querySelector("a").href = topic.webflowUrl;
    return listItem;
  }

  /**
   * @param {ChangelogTopic[]} topics
   * @param {Date} lastVisitedDate
   */
  render(topics, lastVisitedDate) {
    this.list.innerHTML = "";
    let timestamp = null;
    for (let topic of topics) {
      if (timestamp != topic.createdAt.toLocaleDateString()) {
        timestamp = topic.createdAt.toLocaleDateString();
        const timestampListItem = this.timestampListItemTemplate.cloneNode(true);
        timestampListItem.innerHTML = timestamp;
        this.list.append(timestampListItem);
      }

      const isUnread = topic.createdAt.getTime() > lastVisitedDate.getTime();
      const listItem = this.renderListItem(topic, isUnread);
      this.list.append(listItem);
    }
  }
}

export default ChangelogList;