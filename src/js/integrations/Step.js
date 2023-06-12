import { icaseEqual, icaseIncludes } from "../common";
import MarkdownIt from "markdown-it";


function Step(key, data)
{
  this.key = key;
  this.info = data.info;
  this.versions = data.versions;
  this.latestVersion = Object.keys(this.versions)[0];

  this.getCategories = () => this.versions[this.latestVersion].type_tags ? this.versions[this.latestVersion].type_tags : ['other'];
  this.getPlatforms = () => this.versions[this.latestVersion].project_type_tags;

  this.getSVGIcon = () => this.versions[this.latestVersion].asset_urls ? this.versions[this.latestVersion].asset_urls['icon.svg'] : null;
  this.getDescription = () => this.versions[this.latestVersion].description;
  this.getSummary = () => this.versions[this.latestVersion].summary;
  this.getFormattedSummary = () => MarkdownIt().render(this.getSummary());
  this.getTitle = () => this.versions[this.latestVersion].title;
  this.getKey = () => this.key;

  this.fitsPlatform = platform => 
    !platform ||
    !this.getPlatforms() ||
    this.getPlatforms().filter(plat => icaseEqual(plat, platform)).length > 0;

  this.fitsCategory = category =>
    !category || 
    this.getCategories().filter(cat => icaseEqual(cat, category)).length > 0;

  this.fitsQuery = query =>
    !query ||
    icaseIncludes(this.getKey(), query) ||
    icaseIncludes(this.getTitle(), query) ||
    icaseIncludes(this.getSummary(), query);
}

export default Step;