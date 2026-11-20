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

/**
 * Where the SSR job publishes the compact data file and the worker serves it from (same origin as the pages).
 * It only carries the fields the client needs to filter the pre-rendered list, see compactSpec().
 */
export const COMPACT_DATA_PATH = '/integrations/data.json';

/**
 * Reduces the steplib spec to what the list page filters and sidebar need: the latest version's title, summary and
 * tags, plus the deprecation flag. The result has the same shape as the spec, so Step works on it unchanged.
 * @param {SteplibResponse} spec
 * @returns {{steps: {[key: string]: StepData}}}
 */
export function compactSpec(spec) {
  const steps = {};
  Object.entries(spec.steps).forEach(([slug, data]) => {
    const [latestKey] = Object.keys(data.versions);
    const latest = data.versions[latestKey];
    steps[slug] = {
      info: data.info.deprecate_notes ? { deprecate_notes: data.info.deprecate_notes } : {},
      versions: {
        [latestKey]: {
          title: latest.title,
          summary: latest.summary,
          type_tags: latest.type_tags,
          project_type_tags: latest.project_type_tags,
        },
      },
    };
  });
  return { steps };
}

class IntegrationsService {
  constructor() {
    this.url = 'https://steplib.bitrise.io/slim-spec.json.gz';
  }

  /** @returns {Promise<SteplibResponse>} */
  async loadSpec() {
    const response = await fetch(this.url);
    return response.json();
  }

  /**
   * Loads the compact data file served next to the pre-rendered pages.
   * Falls back to the full spec when it is unavailable.
   * @returns {Promise<Integrations>}
   */
  async loadCompactIntegrations() {
    try {
      const response = await fetch(COMPACT_DATA_PATH);
      if (response.ok) {
        return this.fromSpec(await response.json());
      }
    } catch (error) {
      // fall through to the full spec
    }
    return this.loadIntegrations();
  }

  /** @returns {Promise<Integrations>} */
  async loadIntegrations() {
    return this.fromSpec(await this.loadSpec());
  }

  /**
   * @param {{steps: {[key: string]: StepData}}} spec
   * @returns {Integrations}
   */
  fromSpec(spec) {
    const integrations = new Integrations();

    Object.keys(spec.steps).forEach((slug) => {
      const step = new Step(slug, spec.steps[slug]);
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
