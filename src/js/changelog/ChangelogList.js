import { renderList } from './render';

class ChangelogList {
  /** @param {HTMLUListElement} list */
  constructor(list) {
    /** @type {HTMLUListElement} */
    this.list = list;

    /** @type {string} */
    this.originalContent = this.list.innerHTML;

    // The worker renders the first topics into the page; without it the list only holds the template's samples.
    /** @type {boolean} */
    this.isServerRendered = this.list.dataset.ssr === 'true';
    if (!this.isServerRendered) this.list.innerHTML = '';
  }

  /**
   * @param {import('./ChangelogTopic').default[]} topics
   * @param {Date} lastVisitedDate
   * @param {{search?: string, showTags?: string[]}} filters
   */
  render(topics, lastVisitedDate, filters = {}) {
    this.list.innerHTML = renderList(topics, lastVisitedDate, filters);
  }

  reset() {
    this.list.innerHTML = this.originalContent;
  }
}

export default ChangelogList;
