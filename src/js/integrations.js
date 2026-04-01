import IntegrationsService from './integrations/IntegrationsService';
import { renderStepList, isStepListRendered } from './integrations/renderStepList';
import { initializeStepList } from './integrations/initializeStepList';
import { applyProxyFallback } from './integrations/config';
import { setDocumentContext } from './shared/context';

import '../css/integrations.css';

const url = new URL(document.location.href);

(async () => {
  const integrations = await IntegrationsService.loadIntegrations();

  if (!isStepListRendered(document)) {
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
