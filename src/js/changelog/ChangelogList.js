import ChangelogTopic from "./ChangelogTopic";

class ChangelogList
{
  constructor(list) {
    /** @type {HTMLUListElement} */
    this.list = list;

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

    this.list.append(this.renderLoadingListItem());
    this.list.append(this.renderLoadingListItem());
    this.list.append(this.renderLoadingListItem());
  }

  renderLoadingListItem() {
    const listItem = this.readListItemTemplate.cloneNode(true);
    listItem.querySelector(".changelog-timestamp").innerHTML = "<span class='changelog-loading'>Loading</span>";
    listItem.querySelector(".changelog-title").innerHTML = "<span class='changelog-loading'>Loading</span>";
    listItem.querySelectorAll(".display-inline .display-inline").forEach(elem => elem.remove());
    return listItem;
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
   */
  render(topics) {
    this.list.innerHTML = "";
    for (let topic of topics) {
      if (!this.listItems[topic.id]) {
        const listItem = this.renderListItem(topic);
        this.listItems[topic.id] = listItem;
        this.list.append(listItem);
      }
    }
  }
}

export default ChangelogList;