import IntegrationsService from './integrations/IntegrationsService';
import { renderStepList, isStepListRendered } from './integrations/renderStepList';
import { initializeStepList } from './integrations/initializeStepList';
import { applyProxyFallback } from './integrations/config';
import { setDocumentContext } from './shared/context';

import '../css/integrations.css';

const url = new URL(document.location.href);

(async () => {
  // A pre-rendered page only needs the compact data to filter; anything else renders the list itself.
  const prerendered = isStepListRendered(document);
  const integrations = prerendered
    ? await IntegrationsService.loadCompactIntegrations()
    : await IntegrationsService.loadIntegrations();

  if (!prerendered) {
    renderStepList(document, integrations, url);
  } else {
    setDocumentContext(document, url.hostname);
  }

  const platformFilter = url.searchParams.get('platform');
  const categoryFilter = url.searchParams.get('category');
  const queryFilter = url.searchParams.get('query');

  const searchField = document.getElementById('search');
  searchField.value = queryFilter;

  initializeStepList(integrations, platformFilter, categoryFilter, queryFilter);
  await applyProxyFallback();
})();

if (import.meta.webpackHot) import.meta.webpackHot.accept();
