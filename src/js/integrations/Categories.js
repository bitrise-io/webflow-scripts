import Category from "./Category";

function Categories(title) {
  this.title = title;
  this.items = {};

  this.addStep = (key, slug) => {
    if (!(key in this.items)) {
      this.items[key] = new Category(key);
    }
    this.items[key].add(slug);
  }

  this.getItems = () => this.getKeys().map(key => this.items[key]);

  this.getKeys = () => Object.keys(this.items).sort();

  this.getItem = (key) => this.items[key];
}

export default Categories;