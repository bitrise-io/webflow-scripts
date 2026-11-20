import MarkdownIt from 'markdown-it';
import { detectTopicFromUrl, fancyConsoleLog, setMetaContent } from './shared/common';

import StacksService from './stacks/StacksService';
import { githubIcon, messageAlertIcon } from './icons';

import '../css/stacks.css';
import {
  STACKS_API_BASE,
  STACKS_PATH_PREFIX,
  STACKS_PROXY_PATH,
  STACKS_SUBPAGE_PARAM_NAME,
  STACKS_SUBPAGE_PATH_PREFIX,
} from './stacks/config';
import { setDocumentContext } from './shared/context';
import { buildPage, needsRemovalDate } from './stacks/render';
import { renderOverview } from './stacks/renderOverview';

setDocumentContext(document, document.location.hostname);

const stacksAPIBase = STACKS_API_BASE;

const icons = { github: githubIcon, messageAlert: messageAlertIcon };

/**
 * @typedef {{
 *   content_html: string;
 *   notice_html?: string | null;
 *   platform: string;
 *   stack_flavor: string;
 *   stack_id: string;
 *   stack_name: string;
 *   summary: string;
 *   updated_at: string;
 * }} StackReportData
 * @typedef {{
 *   content_html: string;
 *   stack_flavor?: string | null;
 *   summary: string;
 *   title: string;
 *   updated_at: string;
 * }} StacksPageData
 */

const resetScripts = [];

const postprocessContent = () => {
  document.querySelectorAll('#stacks-content blockquote.book-hint').forEach((blockquote) => {
    if (blockquote.innerHTML.match(/\]\(/)) {
      const linkMatches = blockquote.innerHTML.match(/\]\(.*?\)/g);
      let innerHtml = blockquote.innerHTML;
      linkMatches.forEach((linkMatch) => {
        innerHtml = innerHtml.replace(
          linkMatch,
          linkMatch
            .toLowerCase()
            .replace(/(\s|%20)+/, '-')
            .replace(/\.md/, ''),
        );
      });
      blockquote.innerHTML = `<div>${MarkdownIt().renderInline(innerHtml)}</div>`;
    }
  });
};

(async () => {
  const url = new URL(document.location.href);
  const pagePath = detectTopicFromUrl(url, STACKS_PATH_PREFIX, STACKS_SUBPAGE_PARAM_NAME).replace(/\/$/, '');
  const pageType = pagePath.split('/')[0];

  if (pageType === '') {
    const xcodeStackList = document.getElementById('xcode-stack-list');
    const ubuntuStackList = document.getElementById('ubuntu-stack-list');
    const awsStackList = document.getElementById('aws-stack-list');
    const announcementsList = document.getElementById('announcement-list');
    const tipsList = document.getElementById('stack-tips');

    // When the page did not come through the worker, render the lists here with the same code the worker uses.
    if (xcodeStackList.dataset.ssr !== 'true') {
      const stackService = new StacksService();
      const overview = renderOverview(await stackService.fetchStacksIndexJson());

      [
        [xcodeStackList, overview.xcode],
        [ubuntuStackList, overview.ubuntu],
        [awsStackList, overview.aws],
      ].forEach(([list, rows]) => {
        const originalContent = list.innerHTML;
        resetScripts.push(() => {
          list.innerHTML = originalContent;
        });
        // The header row stays, the placeholder rows of the template are replaced.
        list.querySelectorAll('.stack-row:not(.stack-row-header)').forEach((row) => row.remove());
        list.insertAdjacentHTML('beforeend', rows);
      });

      [
        [announcementsList, overview.announcements],
        [tipsList, overview.tips],
      ].forEach(([list, items]) => {
        const originalContent = list.innerHTML;
        resetScripts.push(() => {
          list.innerHTML = originalContent;
        });
        list.innerHTML = items;
      });

      ubuntuStackList.parentElement.querySelector('.stacks-heading-h3').innerHTML = 'Linux';
    }

    const updateHistoryButton = document.getElementById('update-history-button');
    updateHistoryButton.innerHTML = `${githubIcon} ${updateHistoryButton.textContent}`;

    const getNotifiedButton = document.getElementById('get-notified-button');
    getNotifiedButton.innerHTML = `${messageAlertIcon} ${getNotifiedButton.textContent}`;

    [
      [xcodeStackList, 'macOS', 'macos-stack-update-policy'],
      [ubuntuStackList, 'Linux', 'linux-stack-update-policy'],
    ].forEach(([list, platform, policyPage]) => {
      const container = list.parentElement;
      container.classList.add('stack-list-container');

      const notice = document.createElement('div');
      notice.innerHTML = `<blockquote class="book-hint info">
      <div>
        <strong>${platform} stack update policy</strong><br />
        Learn more about how ${platform} stacks are updated.
      </div>
      <a href="https://docs.bitrise.io/en/bitrise-platform/infrastructure/build-stacks/${policyPage}.html" target="_blank">Learn more</a>
    </blockquote>`;
      container.appendChild(notice);
      resetScripts.push(() => notice.remove());
    });
  } else if (['changelogs', 'announcements', 'tools', 'tips', 'stack_reports'].includes(pageType)) {
    if (pagePath.split('/').length < 2 || pagePath.split('/')[1] === '') {
      window.location.href = '/stacks';
    }

    const contentElement = document.getElementById('stacks-content');
    if (contentElement.dataset.ssr === 'true') {
      // The worker already rendered the page (content, title, meta tags); only the icons need the bundle.
      document.querySelectorAll('#stacks-meta [data-icon]').forEach((link) => {
        link.innerHTML = `${icons[link.dataset.icon]} ${link.textContent.trim()}`;
      });
    } else {
      const [response, indexJson] = await Promise.all([
        fetch(`${stacksAPIBase}${pagePath}/index.json`),
        needsRemovalDate(pageType) ? fetch(`${stacksAPIBase}index.json`).then((res) => res.json()) : null,
      ]);
      /** @type {StackReportData | StacksPageData} */
      const data = await response.json();
      const view = buildPage(pagePath, data, indexJson, icons);

      document.title = view.title;
      document.querySelector("link[rel='canonical']").setAttribute('href', view.canonical);
      if (view.description) setMetaContent({ name: 'description' }, view.description);
      setMetaContent({ property: 'og:title' }, view.title);
      if (view.description) setMetaContent({ property: 'og:description' }, view.description);
      setMetaContent({ property: 'twitter:title' }, view.title);
      if (view.description) setMetaContent({ property: 'twitter:description' }, view.description);

      document.getElementById('stacks-title').innerHTML = view.titleHtml;
      document.getElementById('stacks-title').style.textWrap = 'balance';
      document.getElementById('stacks-meta').innerHTML = view.metaHtml;
      contentElement.innerHTML = view.contentHtml;
    }
    postprocessContent();
  } else {
    window.location.href = '/stacks';
  }

  const proxyAvailable = await fetch(STACKS_PROXY_PATH)
    .then((proxyResponse) => proxyResponse.ok)
    .catch(() => false);

  if (!proxyAvailable) {
    document.querySelectorAll(`a[href^="${STACKS_PATH_PREFIX}"]`).forEach((link) => {
      if (!link.href.match(/\.xml$/)) {
        const subPath = link.getAttribute('href').replace(new RegExp(`^.*${STACKS_PATH_PREFIX}/`), '');
        link.href = `${STACKS_SUBPAGE_PATH_PREFIX}?${STACKS_SUBPAGE_PARAM_NAME}=${subPath}`;
      }
    });
  }

  fancyConsoleLog('Bitrise.io Stacks');
})();

if (import.meta.webpackHot) {
  import.meta.webpackHot.dispose(() => {
    resetScripts.forEach((resetScript) => {
      resetScript();
    });
  });
  import.meta.webpackHot.accept();
}
