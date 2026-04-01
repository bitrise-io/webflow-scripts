import DetailsSection from './DetailsSection';
import HeaderSection from './HeaderSection';
import { detectTopicFromUrl, setMetaContent } from '../shared/common';
import { setDocumentContext } from '../shared/context';
import {
  INTEGRATIONS_PATH_PREFIX,
  INTEGRATIONS_SUBPAGE_PARAM_NAME,
} from './config';

const RENDER_FLAG = 'data-integrations-step-rendered';

/**
 * Checks whether the step detail page has already been pre-rendered.
 * @param {Document} doc
 * @returns {boolean}
 */
export function isStepDetailRendered(doc) {
  return doc.documentElement.hasAttribute(RENDER_FLAG);
}

/**
 * Renders a step detail page into the provided document.
 * @param {Document} doc
 * @param {import('./Integrations').default} integrations
 * @param {URL} url
 * @returns {import('./Step').default|null} The rendered step, or null if not found
 */
export function renderStepDetail(doc, integrations, url) {
  setDocumentContext(doc, url.hostname);

  const stepFilter = detectTopicFromUrl(url, INTEGRATIONS_PATH_PREFIX, INTEGRATIONS_SUBPAGE_PARAM_NAME);

  if (!stepFilter || !(stepFilter in integrations.steps)) {
    return null;
  }

  const step = integrations.steps[stepFilter];

  doc.title = `${step.title} | Bitrise Integration Steps`;
  doc
    .querySelector("link[rel='canonical']")
    .setAttribute('href', `https://bitrise.io/integrations/steps/${step.key}`);
  setMetaContent({ name: 'description' }, step.summary.replace(/\s+/g, ' '));
  setMetaContent({ property: 'og:title' }, `${step.title} | Bitrise Integration Steps`);
  setMetaContent({ property: 'og:description' }, step.summary.replace(/\s+/g, ' '));
  setMetaContent({ property: 'og:image' }, step.svgIcon);
  setMetaContent({ property: 'twitter:title' }, `${step.title} | Bitrise Integration Steps`);
  setMetaContent({ property: 'twitter:description' }, step.summary.replace(/\s+/g, ' '));
  setMetaContent({ property: 'twitter:image' }, step.svgIcon);

  if (step.isDeprecated()) {
    setMetaContent({ name: 'robots' }, 'noindex');
  }

  const header = new HeaderSection();
  const details = new DetailsSection();
  header.render(integrations, step);
  details.render(integrations, step);

  doc.documentElement.setAttribute(RENDER_FLAG, '');

  return step;
}
