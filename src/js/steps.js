import IntegrationsService from './integrations/IntegrationsService';
import { renderStepDetail, isStepDetailRendered } from './integrations/renderStepDetail';
import { initializeStepDetail } from './integrations/initializeStepDetail';
import { detectTopicFromUrl } from './shared/common';
import { setDocumentContext } from './shared/context';
import { INTEGRATIONS_PATH_PREFIX, INTEGRATIONS_SUBPAGE_PARAM_NAME, applyProxyFallback } from './integrations/config';

import '../css/steps.css';

const url = new URL(document.location.href);

(async () => {
  const integrations = await IntegrationsService.loadIntegrations();

  let step;
  if (isStepDetailRendered(document)) {
    const canonicalUrl = new URL(document.querySelector('link[rel="canonical"]')?.href);
    setDocumentContext(document, url.hostname);
    const stepFilter = detectTopicFromUrl(canonicalUrl, INTEGRATIONS_PATH_PREFIX, INTEGRATIONS_SUBPAGE_PARAM_NAME);
    step = integrations.steps[stepFilter];
  } else {
    step = renderStepDetail(document, integrations, url);
  }

  if (!step) {
    window.location.href = '/integrations';
    return;
  }

  initializeStepDetail(step);
  await applyProxyFallback();
})();

if (import.meta.webpackHot) import.meta.webpackHot.accept();
