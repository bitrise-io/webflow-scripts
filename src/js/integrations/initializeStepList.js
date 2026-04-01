import { fancyConsoleLog } from '../shared/common';
import SidebarSection from './SidebarSection';
import StepListSection from './StepListSection';

/**
 * Initializes client-side behavior for the integrations list page.
 * Expects document context to be already set.
 * @param {import('./Integrations').default} integrations
 * @param {?string} platformFilter
 * @param {?string} categoryFilter
 */
export function initializeStepList(integrations, platformFilter, categoryFilter) {
  const sidebar = new SidebarSection();
  const content = new StepListSection();

  const searchField = document.getElementById('search');
  searchField.parentNode.action = document.location.pathname; // TODO: move to webflow

  searchField.addEventListener('keyup', (event) => {
    sidebar.render(integrations, platformFilter, categoryFilter, event.target.value);
    sidebar.attachClickHandlers();
    content.render(integrations, platformFilter, categoryFilter, event.target.value);
  });

  sidebar.attachClickHandlers();

  const match = window.location.hash.match(/category-(.*)/);
  if (platformFilter && !match) {
    document.querySelector('.category-anchor').style.marginTop = sidebar.getAnchorMarginTop();
    window.setTimeout(() => {
      window.location.hash = document.querySelector('.category-anchor').id;
    }, 500);
  } else if (match) {
    document.getElementById(`category-${match[1]}`).style.marginTop = sidebar.getAnchorMarginTop();
    window.location.hash = '';
    window.setTimeout(() => {
      window.location.hash = `category-${match[1]}`;
    }, 500);
  }

  fancyConsoleLog('Bitrise.io Integrations');
}
