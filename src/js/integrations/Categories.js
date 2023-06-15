import Category from "./Category";


class Categories
{
  /** @param {string} title */
  constructor(title) {
    /** @type {string} */
    this.title = title;

    /** @type {{[key: string]: Category}} */
    this.items = {};
  }
  
  /**
   * @param {string} key 
   * @param {string} slug 
   */
  addStep(key, slug) {
    if (!(key in this.items)) {
      this.items[key] = new Category(key);
    }
    this.items[key].add(slug);
  }

  /** @returns {Category[]} */
  getItems() {
    return this.getKeys().map(key => this.items[key]);
  }

  /** @returns {string[]} */
  getKeys() {
    return Object.keys(this.items).sort();
  }

  /** 
   * @param {string} key
   * @returns {Category}
   */
  getItem(key) {
    return this.items[key];
  }
}

export default Categories;