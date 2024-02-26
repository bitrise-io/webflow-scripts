import { formatDate } from "../common";
import ChangelogTopic, { ChangelogTag } from "./ChangelogTopic";

class ChangelogList
{
  constructor(list) {
    /** @type {HTMLUListElement} */
    this.list = list;

    /** @type {HTMLDivElement} */
    this.tagPurpleFilledTemplate = this.list.querySelector("#changelog-tag-purple-filled");
    this.tagPurpleFilledTemplate.id = "";
    this.tagPurpleFilledTemplate.remove();

    /** @type {HTMLDivElement} */
    this.tagPurpleTemplate = this.list.querySelector("#changelog-tag-purple");
    this.tagPurpleTemplate.id = "";
    this.tagPurpleTemplate.remove();

    /** @type {HTMLDivElement} */
    this.tagBlueTemplate = this.list.querySelector("#changelog-tag-blue");
    this.tagBlueTemplate.id = "";
    this.tagBlueTemplate.remove();

    /** @type {HTMLDivElement} */
    this.tagYelowTemplate = this.list.querySelector("#changelog-tag-yellow");
    this.tagYelowTemplate.id = "";
    this.tagYelowTemplate.remove();

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
   * @param {ChangelogTag[]} tags 
   * @returns {HTMLDivElement?}
   */
  getTopicTag(tags) {
    if (tags.includes("new-feature")) {
      const listItemTag = this.tagPurpleFilledTemplate.cloneNode(true);
      listItemTag.innerHTML = `🎉 New feature`;
      return listItemTag;
    }
    else if (tags.includes("feature-update")) {
      const listItemTag = this.tagPurpleTemplate.cloneNode(true);
      listItemTag.innerHTML = 'Feature update';
      return listItemTag;
    }
    else if (tags.includes("step-update")) {
      const listItemTag = this.tagBlueTemplate.cloneNode(true);
      listItemTag.innerHTML = 'Step update';
      return listItemTag;
    }
    else if (tags.includes("deprecation")) {
      const listItemTag = this.tagYelowTemplate.cloneNode(true);
      listItemTag.innerHTML = 'Deprecation';
      return listItemTag;
    }
    return null;
  }

  /**
   * @param {ChangelogTopic} topic 
   * @param {boolean} isUnread
   * @returns {HTMLLIElement}
   */
  renderListItem(topic, isUnread = false) {
    const listItem = (isUnread ? this.unreadListItemTemplate : this.readListItemTemplate).cloneNode(true);
    listItem.querySelector(".changelog-timestamp").innerHTML = formatDate(topic.createdAt);

    /** @type {HTMLDivElement} */
    const changelogTitleElement = listItem.querySelector(".changelog-title");
    changelogTitleElement.innerHTML = topic.fancyTitle;
    
    const listItemTag = this.getTopicTag(topic.tags);
    if (listItemTag) changelogTitleElement.parentNode.insertBefore(listItemTag, changelogTitleElement);

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
      if (timestamp != formatDate(topic.createdAt)) {
        timestamp = formatDate(topic.createdAt);
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