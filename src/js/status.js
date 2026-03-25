import '../css/status.css';
import { renderStatus } from './shared/status';

window.addEventListener('load', async () => {
  await renderStatus(document.getElementById('statuspage'));
});

if (import.meta.webpackHot) import.meta.webpackHot.accept();
