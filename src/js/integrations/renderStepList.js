import { setDocumentContext } from '../shared/context';
import StepListSection from './StepListSection';
import SidebarSection from './SidebarSection';

const RENDER_FLAG = 'data-integrations-list-rendered';

/**
 * Checks whether the integrations list page has already been pre-rendered.
 * @param {Document} doc
 * @returns {boolean}
 */
export function isStepListRendered(doc) {
  return doc.documentElement.hasAttribute(RENDER_FLAG);
}

/**
 * @typedef {{
 *  content: StepListSection,
 *  sidebar: SidebarSection,
 * }} RenderStepListResult
 */

/**
 * Renders the integrations list page into the provided document.
 * @param {Document} doc
 * @param {import('./Integrations').default} integrations
 * @param {URL} url
 * @returns {RenderStepListResult}
 */
export function renderStepList(doc, integrations, url) {
  setDocumentContext(doc, url.hostname);

  const content = new StepListSection();
  const sidebar = new SidebarSection();
  sidebar.render(integrations);
  content.render(integrations);

  doc.documentElement.setAttribute(RENDER_FLAG, '');

  return { content, sidebar };
}
