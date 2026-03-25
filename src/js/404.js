import '../css/404.css';
import '../css/status.css';
import { renderStatus } from './shared/status';

window.addEventListener('load', async () => {
  renderStatus(document.querySelector('div#bitrise-status a'));
});
