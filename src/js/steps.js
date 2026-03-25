import DetailsSection from './integrations/DetailsSection';
import HeaderSection from './integrations/HeaderSection';
import IntegrationsService from './integrations/IntegrationsService';
import { detectTopicFromUrl, fancyConsoleLog, setMetaContent } from './shared/common';

import '../css/steps.css';
import { INTEGRATIONS_PATH_PREFIX, INTEGRATIONS_SUBPAGE_PARAM_NAME } from './integrations/config';

const url = new URL(document.location.href);
const stepFilter = detectTopicFromUrl(url, INTEGRATIONS_PATH_PREFIX, INTEGRATIONS_SUBPAGE_PARAM_NAME);

const header = new HeaderSection();
const details = new DetailsSection();

(async () => {
  const integrations = await IntegrationsService.loadIntegrations();
  if (!stepFilter || !(stepFilter in integrations.steps)) {
    window.location.href = '/integrations';
  } else {
    const step = integrations.steps[stepFilter];

    document.title = `${step.title} | Bitrise Integration Steps`;
    document
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

    header.render(integrations, step);
    details.render(integrations, step);

    const proxyAvailable = await fetch('/integrations-proxy')
      .then((proxyResponse) => proxyResponse.ok)
      .catch(() => false);

    if (!proxyAvailable) {
      document.querySelectorAll('a[href^="/integrations"]').forEach((link) => {
        link.href = `/integrations/step?step=${link.getAttribute('href').replace(/^.*\/integrations\/steps\//, '')}`;
      });
    }

    fancyConsoleLog(`Bitrise.io Integrations: ${step.title}`);
  }
})();

if (import.meta.webpackHot) import.meta.webpackHot.accept();
