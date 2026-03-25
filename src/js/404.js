import '../css/404.css';
import '../css/status.css';
import ChangelogService from './changelog/ChangelogService';
import { detectTopicFromUrl } from './shared/common';
import { renderStatus } from './shared/status';

(async () => {
  const url = new URL(document.location.href);
  const topicSlugId = detectTopicFromUrl(url, 'changelog', 'topic');
  if (topicSlugId) {
    const apiBase = document.location.hostname.match(/(localhost|127\.0\.0\.1)/) ? '' : 'https://bitrise.io';
    const changelogService = new ChangelogService(apiBase, 'https://app.bitrise.io');
    const currentApiBase = await changelogService.getApiBase();
    if (currentApiBase === changelogService.fallbackApiBase) {
      window.location.href = `/changelog/topic?topic=${topicSlugId}`;
    }
  }
})();

window.addEventListener('load', async () => {
  renderStatus(document.querySelector('div#bitrise-status a'));
});
