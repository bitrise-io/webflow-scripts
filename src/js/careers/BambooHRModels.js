class BambooPosition
{
  constructor(id, url, title, location, department) {
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

  get hostedUrl() {
    return this.url;
  }

  get categories() {
    return {
      location: this.location,
      team: this.department,
    }
  }

  get text() {
    return this.title;
  }
}

class BambooDepartment
{
  /**
   * @param {number} id 
   * @param {string} name 
   */
  constructor(id, name) {
    /** @type {number} */
    this.id = id;
    /** @type {string} */
    this.name = name;
    /** @type {BambooPosition[]} */
    this.posts = [];
    /** @type {boolean} */
    this.isOpen = false;
  }
}

class BambooJobs
{
  constructor() {
    /** @type {BambooDepartment[]} */
    this.departments = [];
  }
}

export {BambooPosition, BambooDepartment, BambooJobs};