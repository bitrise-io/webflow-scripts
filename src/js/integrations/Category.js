import { capitalize } from '../shared/common';

class Category {
  /** @param {string} name */
  constructor(name) {
    /** @type {string} */
    this.name = name;

    /** @type {string[]} */
    this.steps = [];
  }

  /** @param {string} slug */
  add(slug) {
    this.steps.push(slug);
  }

  /** @returns {string} */
  getName() {
    if (this.name === 'ios') return 'iOS';
    if (this.name === 'macos') return 'macOS';
    return capitalize(this.name.replace('-', ' '));
  }

  getSlug() {
    return this.name;
  }
}

export default Category;
