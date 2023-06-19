class Position
{
  /**
   * @param {string} url 
   * @param {string} title 
   * @param {string} location 
   * @param {string} department 
   * @param {string|number|null} id 
   */
  constructor(url, title, location, department, id) {
    /** @type {number} */
    this.id = id;
    /** @type {string} */
    this.url = url;
    /** @type {string} */
    this.title = title;
    /** @type {string} */
    this.location = location;
    /** @type {string} */
    this.department = department;
  }

  get tags() {
    return [
      this.location,
      this.department,
    ];
  }
}

class Department
{
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

export {Position, Department};