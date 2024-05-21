import Integrations from './Integrations';
import Step from './Step';

/**
 * @typedef {object} StepInfo
 * @property {{"icon.svg": ?string}} asset_urls
 * @property {string} maintainer
 */

/**
 * @typedef {object} StepVersion
 * @property {{"icon.svg": ?string}} asset_urls
 * @property {string} description
 * @property {string[]|undefined} host_os_tags
 * @property {string[]|undefined} project_type_tags
 * @property {string} published_at
 * @property {{git: string, commit: string}} source
 * @property {string} source_code_url
 * @property {string} summary
 * @property {string} support_url
 * @property {string} title
 * @property {{[key: string]: {package_name: string}}|undefined} toolkit
 * @property {string[]|undefined} type_tags
 * @property {string} website
 */

/**
 * @typedef {object} StepData
 * @property {StepInfo} info
 * @property {{[key: string]: StepVersion}} versions
 */

class IntegrationsService {
  constructor() {
    this.url = 'https://bitrise-steplib-collection.s3.amazonaws.com/slim-spec.json.gz';
  }

  /** @returns {Promise<Integrations>} */
  async loadIntegrations() {
    const response = await fetch(this.url);

    /** @type {{"steps": {[key: string]: StepData}}} */
    const json = await response.json();

    const integrations = new Integrations();

    Object.keys(json.steps).forEach((slug) => {
      const step = new Step(slug, json.steps[slug]);
      integrations.steps[slug] = step;

      step.categories.forEach((category) => integrations.categories.addStep(category, slug));
      if (step.platforms) {
        step.platforms.forEach((paltform) => integrations.platforms.addStep(paltform, slug));
      }
    });

    return integrations;
  }

  /**
   * @param {string} slug
   * @returns {Promise<Step>}
   */
  async loadStep(slug) {
    const integrations = await this.loadIntegrations();
    return integrations.steps[slug];
  }
}

export default new IntegrationsService();
