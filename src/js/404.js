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
})();

window.addEventListener('load', async () => {
  renderStatus(document.querySelector('div#bitrise-status a'));
});
