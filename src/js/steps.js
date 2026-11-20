import IntegrationsService from './integrations/IntegrationsService';
import { renderStepDetail, isStepDetailRendered } from './integrations/renderStepDetail';
import { initializeStepDetail } from './integrations/initializeStepDetail';
import { applyProxyFallback } from './integrations/config';

import '../css/steps.css';

const url = new URL(document.location.href);

(async () => {
  let title;
  if (isStepDetailRendered(document)) {
    // Everything on a pre-rendered page is already in the DOM, no need to download the steplib data.
    title = document.getElementById('integrations-step-details-title')?.textContent;
  } else {
    const integrations = await IntegrationsService.loadIntegrations();
    title = renderStepDetail(document, integrations, url)?.title;
  }

  if (!title) {
    window.location.href = '/integrations';
    return;
  }

  initializeStepDetail(title);
  await applyProxyFallback();
})();

if (import.meta.webpackHot) import.meta.webpackHot.accept();
