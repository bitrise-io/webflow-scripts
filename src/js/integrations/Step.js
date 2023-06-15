import { icaseEqual, icaseIncludes } from "../common";
import MarkdownIt from "markdown-it";


class Step
{
  /**
   * @param {string} key 
   * @param {import("./IntegrationsService").StepData} data 
   */
  constructor(key, data) {
    /** @type {string} */
    this.stepKey = key;

    /** @type {import("./IntegrationsService").StepInfo} */
    this.info = data.info;

    /** @type {{[key: string]: import("./IntegrationsService").StepVersion}} */
    this.versions = data.versions;

    this.latestVersion = Object.keys(this.versions)[0];
  }

  /** @returns {string[]} */
  get categories() {
    return this.versions[this.latestVersion].type_tags || ['other'];
  }

  /** @returns {?string[]} */
  get platforms() {
    return this.versions[this.latestVersion].project_type_tags || null;
  }

  /** @returns {?string} */
  get svgIcon() {
    return this.versions[this.latestVersion].asset_urls ?
      this.versions[this.latestVersion].asset_urls['icon.svg'] : 
      null;
  }

  /** @returns {string} */
  get description() {
    return this.versions[this.latestVersion].description;
  }

  /** @returns {string} */
  get formattedDescription() {
    return MarkdownIt().render(this.versions[this.latestVersion].description);
  }

  /** @returns {string} */
  get summary() {
    return this.versions[this.latestVersion].summary;
  }

  get formattedSummary() {
    return MarkdownIt().renderInline(this.versions[this.latestVersion].summary);
  }

  /** @returns {string} */
  get title() {
    return this.versions[this.latestVersion].title;
  }

  /** @returns {string} */
  get key() {
    return this.stepKey;
  }

  /** @returns {string} */
  get sourceCodeUrl() {
    return this.versions[this.latestVersion].source_code_url;
  }

  /**
   * @param {?string} platform 
   * @returns {boolean}
   */
  fitsPlatform(platform) {
    return !platform ||
      !this.platforms ||
      this.platforms.filter(plat => icaseEqual(plat, platform)).length > 0;
  }

  /**
   * @param {?string} category 
   * @returns {boolean}
   */
  fitsCategory(category) {
    return !category ||
      this.categories.filter(cat => icaseEqual(cat, category)).length > 0;
  }

  /**
   * @param {?string} query 
   * @returns {boolean}
   */
  fitsQuery(query) {
    return !query ||
      icaseIncludes(this.key, query) ||
      icaseIncludes(this.title, query) ||
      icaseIncludes(this.summary, query);
  }
}

export default Step;