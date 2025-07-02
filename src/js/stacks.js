import { detectTopicFromUrl, fancyConsoleLog, formatDate } from './shared/common';

import '../css/stacks.css';
import StacksService from './stacks/StacksService';
import { githubIcon, messageAlertIcon } from './icons';

const stacksAPIBase = 'https://stacks.bitrise.io/';

/**
 * @typedef {{
 *   content_html: string;
 *   platform: string;
 *   stack_flavor: string;
 *   stack_id: string;
 *   stack_name: string;
 *   summary: string;
 *   updated_at: string;
 * }} StackReportData
 * @typedef {{
 *   content_html: string;
 *   summary: string;
 *   title: string;
 *   updated_at: string;
 * }} StacksPageData
 */

const resetScripts = [];

/**
 * Format HTML content
 * @param {string} html
 * @returns {string}
 */
const formatHtml = (html) => {
  return html
    .replaceAll(
      '<summary>',
      `<summary>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M5.29291 10.2071L6.70712 8.79289L12 14.0858L17.2929 8.79289L18.7071 10.2071L12 16.9142L5.29291 10.2071Z" fill="currentColor"/>
    </svg>
  `,
    )
    .replaceAll(/\s+<\/code>/g, '</code>')
    .replaceAll(/href="\//g, 'href="/stacks/')
    .replaceAll(stacksAPIBase, '/stacks/');
};

(async () => {
  const url = new URL(document.location.href);
  const pagePath = detectTopicFromUrl(url, 'stacks').replace(/\/$/, '');
  const pageType = pagePath.split('/')[0];

  if (pageType === '') {
    const stackService = new StacksService();
    const stacksLinks = await stackService.fetchStacksIndexJson();

    const announcementsList = document.getElementById('announcement-list');
    const announcementsListOriginalContent = announcementsList.innerHTML;
    resetScripts.push(() => {
      announcementsList.innerHTML = announcementsListOriginalContent;
    });
    const announcementTemplate = document.getElementById('announcement-template').cloneNode(true);
    announcementTemplate.removeAttribute('id');
    announcementsList.innerHTML = '';

    Object.values(stacksLinks.announcements).forEach((announcementLink) => {
      const announcement = announcementTemplate.cloneNode(true);
      const [path, title, date] = announcementLink;
      announcement.querySelector('.changelog-title').innerHTML = title;
      if (date) announcement.querySelector('.changelog-date').innerHTML = formatDate(new Date(date));
      else announcement.querySelector('.changelog-date').remove();
      announcement.querySelector('a').href = `/stacks${path}`;
      announcementsList.appendChild(announcement);
    });

    const tipsList = document.getElementById('stack-tips');
    const tipsListOriginalContent = tipsList.innerHTML;
    resetScripts.push(() => {
      tipsList.innerHTML = tipsListOriginalContent;
    });
    const tipTemplate = document.getElementById('stack-tip-template').cloneNode(true);
    tipTemplate.removeAttribute('id');
    tipsList.innerHTML = '';

    Object.values(stacksLinks.tips).forEach((tipLink) => {
      const tip = tipTemplate.cloneNode(true);
      const [path, title] = tipLink;
      tip.querySelector('a').innerHTML = title;
      tip.querySelector('a').href = `/stacks${path}`;
      tipsList.appendChild(tip);
    });

    const updateHistoryButton = document.getElementById('update-history-button');
    updateHistoryButton.innerHTML = `${githubIcon} ${updateHistoryButton.textContent}`;

    const getNotifiedButton = document.getElementById('get-notified-button');
    getNotifiedButton.innerHTML = `${messageAlertIcon} ${getNotifiedButton.textContent}`;

    const xcodeStackList = document.getElementById('xcode-stack-list');
    const xcodeStackListOriginalContent = xcodeStackList.innerHTML;
    resetScripts.push(() => {
      xcodeStackList.innerHTML = xcodeStackListOriginalContent;
    });
    const xcodeStableOnlyStack = document.getElementById('xcode-stable-only').cloneNode(true);
    xcodeStableOnlyStack.removeAttribute('id');
    const xcodeStableAndEdgeStack = document.getElementById('xcode-stable-and-edge').cloneNode(true);
    xcodeStableAndEdgeStack.removeAttribute('id');
    const xcodeEdgeOnlyStack = document.getElementById('xcode-edge-only').cloneNode(true);
    xcodeEdgeOnlyStack.removeAttribute('id');
    const xcodeStackMobileViewOnly = document.getElementById('xcode-mobile-view-only').cloneNode(true);
    xcodeStackMobileViewOnly.removeAttribute('id');
    [...xcodeStackList.querySelectorAll('.stack-row')].forEach((row) => {
      if (row.className.match(/stack-row-header/)) {
        // leave header
      } else if (row.id === 'xcode-stable-only' || row.id === 'xcode-stable-and-edge' || row.id === 'xcode-edge-only') {
        row.style.display = 'none';
      } else {
        row.remove();
      }
    });

    const ubuntuStackList = document.getElementById('ubuntu-stack-list');
    const ubuntuStackListOriginalContent = ubuntuStackList.innerHTML;
    resetScripts.push(() => {
      ubuntuStackList.innerHTML = ubuntuStackListOriginalContent;
    });
    const ubuntuStack = ubuntuStackList.querySelectorAll('.stack-row')[1].cloneNode(true);
    [...ubuntuStackList.querySelectorAll('.stack-row')].forEach((row, index) => {
      if (row.className.match(/stack-row-header/)) {
        // leave header
      } else if (index === 1) {
        row.style.display = 'none';
      } else {
        row.remove();
      }
    });

    const awsStackList = document.getElementById('aws-stack-list');
    const awsStackListOriginalContent = awsStackList.innerHTML;
    resetScripts.push(() => {
      awsStackList.innerHTML = awsStackListOriginalContent;
    });
    const awsStack = awsStackList.querySelectorAll('.stack-row')[1].cloneNode(true);
    [...awsStackList.querySelectorAll('.stack-row')].forEach((row, index) => {
      if (row.className.match(/stack-row-header/)) {
        // leave header
      } else if (index === 1) {
        row.style.display = 'none';
      } else {
        row.remove();
      }
    });

    /**
     * Render stack links
     * @param {HTMLElement} linksParent
     * @param {[string, string]} reportsLink
     * @param {[string, string]} changelogsLink
     * @param {boolean} [deprecated=false]
     */
    const renderStackLinks = (linksParent, reportsLink, changelogsLink, deprecated = false) => {
      const reportsLinkElement = linksParent.querySelector('.stack-link-reports');
      const changelogsLinkElement = linksParent.querySelector('.stack-link-changelogs');
      if (reportsLink) {
        reportsLinkElement.href = `/stacks${reportsLink[0]}`;
        // reportsLinkElement.innerHTML = `${reportsLink[1]}`;
        if (reportsLink[2]) reportsLinkElement.title = formatDate(new Date(reportsLink[2]));
        reportsLinkElement.style.visibility = 'visible';
      } else {
        linksParent.querySelector('.stack-links-separator').style.visibility = 'hidden';
        reportsLinkElement.style.visibility = 'hidden';
      }
      if (changelogsLink) {
        changelogsLinkElement.href = `/stacks${changelogsLink[0]}`;
        // changelogsLinkElement.innerHTML = `${changelogsLink[1]}`;
        if (changelogsLink[2]) changelogsLinkElement.title = formatDate(new Date(changelogsLink[2]));
        changelogsLinkElement.style.visibility = 'visible';
      } else {
        linksParent.querySelector('.stack-links-separator').style.visibility = 'hidden';
        changelogsLinkElement.style.visibility = 'hidden';
      }
      if (deprecated) {
        const deprecatedElement = document.createElement('span');
        deprecatedElement.title = deprecated;
        deprecatedElement.textContent = '⚠️';
        deprecatedElement.className = 'deprecated-stack';
        linksParent.appendChild(deprecatedElement);
      }
    };

    Object.keys(stacksLinks.xcode)
      .sort()
      .reverse()
      .forEach((version) => {
        if (!stacksLinks.xcode[version].edge) {
          // stable only
          const row = xcodeStableOnlyStack.cloneNode(true);
          row.style.removeProperty('display');
          row.querySelector('.stack-version-title').innerHTML = stacksLinks.xcode[version].title;
          renderStackLinks(
            row.querySelectorAll('.stack-links')[0],
            stacksLinks.xcode[version].stable.stack_reports,
            stacksLinks.xcode[version].stable.changelogs,
            stacksLinks.xcode[version].stable.deprecated,
          );
          xcodeStackList.appendChild(row);
        } else if (!stacksLinks.xcode[version].stable) {
          // edge only
          const row = xcodeEdgeOnlyStack.cloneNode(true);
          row.style.removeProperty('display');
          row.querySelector('.stack-version-title').innerHTML = stacksLinks.xcode[version].title;
          renderStackLinks(
            row.querySelectorAll('.stack-links')[1],
            stacksLinks.xcode[version].edge.stack_reports,
            stacksLinks.xcode[version].edge.changelogs,
            stacksLinks.xcode[version].edge.deprecated,
          );
          xcodeStackList.appendChild(row);

          const rowMobileOnly = xcodeStackMobileViewOnly.cloneNode(true);
          rowMobileOnly.style.removeProperty('display');
          rowMobileOnly.querySelector('.stack-version-title').innerHTML =
            `${stacksLinks.xcode[version].title} (Edge version)`;
          renderStackLinks(
            rowMobileOnly.querySelectorAll('.stack-links')[0],
            stacksLinks.xcode[version].edge.stack_reports,
            stacksLinks.xcode[version].edge.changelogs,
            stacksLinks.xcode[version].edge.deprecated,
          );
          xcodeStackList.appendChild(rowMobileOnly);
        } else {
          const row = xcodeStableAndEdgeStack.cloneNode(true);
          row.style.removeProperty('display');
          row.querySelector('.stack-version-title').innerHTML = stacksLinks.xcode[version].title;
          renderStackLinks(
            row.querySelectorAll('.stack-links')[0],
            stacksLinks.xcode[version].stable.stack_reports,
            stacksLinks.xcode[version].stable.changelogs,
            stacksLinks.xcode[version].stable.deprecated,
          );
          renderStackLinks(
            row.querySelectorAll('.stack-links')[1],
            stacksLinks.xcode[version].edge.stack_reports,
            stacksLinks.xcode[version].edge.changelogs,
            stacksLinks.xcode[version].edge.deprecated,
          );
          xcodeStackList.appendChild(row);

          const rowMobileOnly = xcodeStackMobileViewOnly.cloneNode(true);
          rowMobileOnly.style.removeProperty('display');
          rowMobileOnly.querySelector('.stack-version-title').innerHTML =
            `${stacksLinks.xcode[version].title}<br />with edge updates`;
          renderStackLinks(
            rowMobileOnly.querySelectorAll('.stack-links')[0],
            stacksLinks.xcode[version].edge.stack_reports,
            stacksLinks.xcode[version].edge.changelogs,
            stacksLinks.xcode[version].edge.deprecated,
          );
          xcodeStackList.appendChild(rowMobileOnly);
        }
      });

    Object.keys(stacksLinks.ubuntu)
      .sort()
      .reverse()
      .forEach((version) => {
        const row = ubuntuStack.cloneNode(true);
        row.style.removeProperty('display');
        row.querySelector('.stack-version-title').innerHTML = stacksLinks.ubuntu[version].title;
        renderStackLinks(
          row.querySelectorAll('.stack-links')[0],
          stacksLinks.ubuntu[version].stack_reports,
          stacksLinks.ubuntu[version].changelogs,
        );
        ubuntuStackList.appendChild(row);
      });

    Object.keys(stacksLinks.aws)
      .sort((aVersion, bVersion) => {
        const aVersionNumeric = aVersion
          .replace('tahoe', '16-')
          .replace('sonoma', '14-')
          .replace('ventura', '13-')
          .replace('sequoia', '15-');
        const bVersionNumeric = bVersion
          .replace('tahoe', '16-')
          .replace('sonoma', '14-')
          .replace('ventura', '13-')
          .replace('sequoia', '15-');
        return aVersionNumeric.localeCompare(bVersionNumeric, undefined, { numeric: true, sensitivity: 'base' });
      })
      .reverse()
      .forEach((version) => {
        const row = awsStack.cloneNode(true);
        row.style.removeProperty('display');
        row.querySelector('.stack-version-title').innerHTML = stacksLinks.aws[version].title;
        renderStackLinks(
          row.querySelectorAll('.stack-links')[0],
          stacksLinks.aws[version].stack_reports,
          stacksLinks.aws[version].changelogs,
        );
        awsStackList.appendChild(row);
      });
  } else if (pageType === 'changelogs' || pageType === 'announcements' || pageType === 'tools' || pageType === 'tips') {
    if (pagePath.split('/').length < 2 || pagePath.split('/')[1] === '') {
      window.location.href = '/stacks';
    }
    const response = await fetch(`${stacksAPIBase}${pagePath}/index.json`);
    /** @type {StacksPageData} */
    const data = await response.json();

    document.getElementById('stacks-title').innerHTML = data.title;
    document.getElementById('stacks-meta').innerHTML = `${formatDate(new Date(data.updated_at))}`;
    document.getElementById('stacks-content').innerHTML = `${formatHtml(data.content_html)}`;
  } else if (pageType === 'stack_reports') {
    if (pagePath.split('/').length < 2 || pagePath.split('/')[1] === '') {
      window.location.href = '/stacks';
    }

    const response = await fetch(`${stacksAPIBase}${pagePath}/index.json`);
    /** @type {StacksPageData} */
    const data = await response.json();

    let changelogPath = `/stacks/changelogs/${data.stack_id}`;
    if (data.stack_id.match(/^aws/)) {
      if (data.stack_id.match(/^aws-mac-virtualized/)) {
        changelogPath = `/stacks/changelogs/aws/aws-mac-virtualized`;
      } else {
        changelogPath = `/stacks/changelogs/aws/${data.stack_id}`;
      }
    }

    document.getElementById('stacks-title').innerHTML = data.stack_name;
    document.getElementById('stacks-meta').innerHTML = `Stack ID: <code>${data.stack_id}</code><br />${
      data.stack_revision && `Current stack revision: <code>${data.stack_revision}</code><br />`
    }<br />
      <span class="button-group">
        <a href="${changelogPath}" title="Changelog" class="button">Changelog</a>
        <a href="https://github.com/bitrise-io/stacks/commits/main/data/${data.stack_id}" target="_blank" title="Update history" class="button is-secondary is-icon is-alternate">
          ${githubIcon}
          Update history
        </a>
        <a href="/stacks/tips/get-notified" title="Get notified" class="button is-secondary is-icon is-alternate">
          ${messageAlertIcon}
          Get notified
        </a>
      </span>
    `;
    document.getElementById('stacks-content').innerHTML = `
      <p>This Bitrise stack contains the following software:</p>
      ${formatHtml(data.content_html)}
    `;
  } else {
    window.location.href = '/stacks';
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
