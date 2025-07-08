import Integrations from './Integrations';
import Step from './Step';

/**
 * @typedef {{
 *  description: string,
 *  published_at: string,
 *  source: {
 *    git: string,
 *    commit: string
 *  },
 *  source_code_url: string,
 *  summary: string,
 *  support_url: string,
 *  title: string,
 *  website: string,
 *  asset_urls?: {"icon.svg": string},
 *  type_tags?: string[],
 *  project_type_tags?: string[],
 *  host_os_tags?: string[],
 * }} StepVersion
 */

/**
 * @typedef {{
 *  maintainer: string,
 *  asset_urls?: {"icon.svg": string},
 *  deprecate_notes?: string,
 *  removal_date?: string,
 * }} StepInfo
 */

/**
 * @typedef {{
 *  info: StepInfo,
 *  versions: {[key: string]: StepVersion},
 * }} StepData
 */

/**
 * @typedef {{
 *  assets_download_base_uri: string,
 *  download_locations: {
 *    type: "zip" | "git",
 *    src: string,
 *  }[],
 *  format_version: string,
 *  generated_at_timestamp: number,
 *  steplib_source: string,
 *  steps: {[key: string]: StepData},
 * }} SteplibResponse
 */

class IntegrationsService {
  constructor() {
    this.url = 'https://bitrise-steplib-collection.s3.amazonaws.com/slim-spec.json.gz';
  }

  /** @returns {Promise<Integrations>} */
  async loadIntegrations() {
    const response = await fetch(this.url);

    /** @type {SteplibResponse} */
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
