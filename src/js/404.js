import '../css/404.css';
import '../css/status.css';
import { detectTopicFromUrl } from './shared/common';
import { renderStatus } from './shared/status';

(async () => {
  const url = new URL(document.location.href);
  const topicSlugId = detectTopicFromUrl(url, 'changelog', 'topic');
  if (topicSlugId) {
    const changelogProxyAvailable = await fetch('/changelog-proxy')
      .then((changelogProxyResponse) => changelogProxyResponse.ok)
      .catch(() => false);
    if (!changelogProxyAvailable) {
      window.location.href = `/changelog/topic?topic=${topicSlugId}`;
    }
  }

  const subpagePath = detectTopicFromUrl(url, 'stacks', 'subpage');
  if (subpagePath) {
    const stacksProxyAvailable = await fetch('/stacks-proxy')
      .then((stacksProxyResponse) => stacksProxyResponse.ok)
      .catch(() => false);
    if (!stacksProxyAvailable) {
      window.location.href = `/stacks/subpage?subpage=${subpagePath}`;
    }
  }

  const stepPath = detectTopicFromUrl(url, 'integrations/steps', 'step');
  if (stepPath) {
    const integrationsProxyAvailable = await fetch('/integrations-proxy')
      .then((integrationsProxyResponse) => integrationsProxyResponse.ok)
      .catch(() => false);
    if (!integrationsProxyAvailable) {
      window.location.href = `/integrations/step?step=${stepPath}`;
    }
  }

  if (url.pathname.match(/^\/resources\/tools\/app-navigator/)) {
    const appNavigatorProxyAvailable = await fetch('/resources/tools/app-navigator-proxy')
      .then((appNavigatorProxyResponse) => appNavigatorProxyResponse.ok)
      .catch(() => false);
    if (!appNavigatorProxyAvailable) {
      window.location.href = `https://app.bitrise.io${url.pathname}`;
    }
  }
})();

window.addEventListener('load', async () => {
  renderStatus(document.querySelector('div#bitrise-status a'));
});
