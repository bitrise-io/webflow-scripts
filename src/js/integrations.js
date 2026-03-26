import IntegrationsService from './integrations/IntegrationsService';
import StepListSection from './integrations/StepListSection';
import SidebarSection from './integrations/SidebarSection';
import { fancyConsoleLog } from './shared/common';

import '../css/integrations.css';
import {
  INTEGRATIONS_PATH_PREFIX,
  INTEGRATIONS_PROXY_PATH,
  INTEGRATIONS_SUBPAGE_PARAM_NAME,
  INTEGRATIONS_SUBPAGE_PATH_PREFIX,
} from './integrations/config';

const url = new URL(document.location.href);
const platformFilter = url.searchParams.get('platform');
const categoryFilter = url.searchParams.get('category');
const queryFilter = url.searchParams.get('query');

const content = new StepListSection();
const sidebar = new SidebarSection();

const searchField = document.getElementById('search');
searchField.parentNode.action = document.location.pathname; // TODO: move to webflow
searchField.value = queryFilter;

(async () => {
  const integrations = await IntegrationsService.loadIntegrations();
  sidebar.render(integrations, platformFilter, categoryFilter, queryFilter);
  content.render(integrations, platformFilter, categoryFilter, queryFilter);

  searchField.addEventListener('keyup', (event) => {
    sidebar.render(integrations, platformFilter, categoryFilter, event.target.value);
    content.render(integrations, platformFilter, categoryFilter, event.target.value);
  });

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

  const proxyAvailable = await fetch(INTEGRATIONS_PROXY_PATH)
    .then((proxyResponse) => proxyResponse.ok)
    .catch(() => false);

  if (!proxyAvailable) {
    document.querySelectorAll(`a[href^="${INTEGRATIONS_PATH_PREFIX}"]`).forEach((link) => {
      const stepKey = link.getAttribute('href').replace(new RegExp(`^.*${INTEGRATIONS_PATH_PREFIX}/`), '');
      link.href = `${INTEGRATIONS_SUBPAGE_PATH_PREFIX}?${INTEGRATIONS_SUBPAGE_PARAM_NAME}=${stepKey}`;
    });
  }

  fancyConsoleLog('Bitrise.io Integrations');
})();

if (import.meta.webpackHot) import.meta.webpackHot.accept();
