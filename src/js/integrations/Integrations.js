import Categories from './Categories';
import Step from './Step';

class Integrations {
  constructor() {
    this.categories = new Categories('Category');
    this.platforms = new Categories('Platform');

    /** @type {{[key: string]: Step}} */
    this.steps = {};
  }
}

export default Integrations;
