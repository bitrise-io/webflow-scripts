import MarkdownIt from 'markdown-it';
import { icaseEqual, icaseIncludes } from '../shared/common';

class Step {
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
  }

  get latestVersion() {
    return this.versions[Object.keys(this.versions)[0]];
  }

  /** @returns {string[]} */
  get categories() {
    return this.latestVersion.type_tags || ['other'];
  }

  /** @returns {string[]|null} */
  get platforms() {
    return this.latestVersion.project_type_tags || null;
  }

  /** @returns {string|null} */
  get svgIcon() {
    if (this.info.asset_urls && this.info.asset_urls['icon.svg']) {
      return this.info.asset_urls['icon.svg'];
    }
    if (this.latestVersion.asset_urls && this.latestVersion.asset_urls['icon.svg']) {
      return this.latestVersion.asset_urls['icon.svg'];
    }
    return null;
  }

  /** @returns {string} */
  get description() {
    return this.latestVersion.description;
  }

  /** @returns {string} */
  get formattedDescription() {
    return MarkdownIt()
      .render(this.description)
      .replace(/<(\/?)(h1|h2)>/g, '<$1h3>');
  }

  /** @returns {string} */
  get summary() {
    return this.latestVersion.summary;
  }

  get formattedSummary() {
    return MarkdownIt().renderInline(this.summary);
  }

  /** @returns {string} */
  get title() {
    return this.latestVersion.title;
  }

  /** @returns {string} */
  get key() {
    return this.stepKey;
  }

  /** @returns {string} */
  get sourceCodeUrl() {
    return this.latestVersion.source_code_url;
  }

  /** @returns {string} */
  get removalDate() {
    return this.info.removal_date || null;
  }

  /** @returns {string} */
  get deprecateNotes() {
    return this.info.deprecate_notes || null;
  }

  /** @returns {boolean} */
  isDeprecated() {
    return !!this.info.deprecate_notes;
  }

  /**
   * @param {?string} platform
   * @returns {boolean}
   */
  fitsPlatform(platform) {
    return !platform || !this.platforms || this.platforms.filter((plat) => icaseEqual(plat, platform)).length > 0;
  }

  /**
   * @param {?string} category
   * @returns {boolean}
   */
  fitsCategory(category) {
    return !category || this.categories.filter((cat) => icaseEqual(cat, category)).length > 0;
  }

  /**
   * @param {?string} query
   * @returns {boolean}
   */
  fitsQuery(query) {
    return (
      !query || icaseIncludes(this.key, query) || icaseIncludes(this.title, query) || icaseIncludes(this.summary, query)
    );
  }
}

export default Step;
