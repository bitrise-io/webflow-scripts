import { capitalize } from "../common";


function Category(name)
{
  this.name = name;
  this.steps = [];

  this.add = slug => {
    this.steps.push(slug);
  };

  this.getName = () => {
    if (this.name == "ios") return "iOS";
    if (this.name == "macos") return "macOS";
    return capitalize(this.name.replace("-", " "));
  }
}

export default Category;