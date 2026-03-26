import '../css/404.css';
import '../css/status.css';
import { handleAppNavigator404 } from './app-navigator/404';
import { handleChangelog404 } from './changelog/404';
import { handleIntegrations404 } from './integrations/404';
import { handleStacks404 } from './stacks/404';
import { renderStatus } from './shared/status';

(async () => {
  const url = new URL(document.location.href);
  await handleStacks404(url);
  await handleChangelog404(url);
  await handleIntegrations404(url);
  await handleAppNavigator404(url);
})();

window.addEventListener('load', async () => {
  renderStatus(document.querySelector('div#bitrise-status a'));
});
