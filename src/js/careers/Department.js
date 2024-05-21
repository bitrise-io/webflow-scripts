import Position from './Position';

class Department {
  /**
   * @param {string} name
   * @param {?number} id
   */
  constructor(name, id) {
    /** @type {number} */
    this.id = id;
    /** @type {string} */
    this.name = name;

    /** @type {Position[]} */
    this.posts = [];
    /** @type {boolean} */
    this.isOpen = false;
  }
}

export default Department;
