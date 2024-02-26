import { ChangelogTag } from "./ChangelogTopic";

class ChangelogTagFactory
{
  constructor() {
    this.tagPurpleFilledTemplate = this.initTag("#changelog-tag-purple-filled");
    this.tagPurpleTemplate = this.initTag("#changelog-tag-purple");
    this.tagBlueTemplate = this.initTag("#changelog-tag-blue");
    this.tagYelowTemplate = this.initTag("#changelog-tag-yellow");
  }

  /**
   * 
   * @param {string} id 
   * @returns {HTMLDivElement}
   */
  initTag(id) {
    /** @type {HTMLDivElement} */
    const tag = document.querySelector(id);
    
    /** @type {HTMLDivElement} */
    const tagTemplate = tag.cloneNode(true);
    tagTemplate.id = "";

    const tagPlaceholder = document.createElement("div");
    tagPlaceholder.className = "changelog-tag-placeholder";
    tag.replaceWith(tagPlaceholder);

    return tagTemplate;
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
}

export default ChangelogTagFactory;