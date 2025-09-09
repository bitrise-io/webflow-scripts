import MarkdownIt from 'markdown-it';
import { detectTopicFromUrl, fancyConsoleLog, formatDate, setMetaContent } from './shared/common';

import StacksService from './stacks/StacksService';
import { githubIcon, messageAlertIcon } from './icons';

import '../css/stacks.css';

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

/**
 * Get the stack removal date for a given stacks based on the page path.
 * @param {string} pagePath
 * @returns {Promise<string|null>} The formatted removal date or null if not available.
 */
const getStackRemovalDate = async (pagePath) => {
  const stacksResponse = await fetch(`${stacksAPIBase}index.json`);
  const stacksData = await stacksResponse.json();
  const stackReportsSection = stacksData?.sections?.find((section) => section.stack_reports);
  const stackReport = stackReportsSection?.stack_reports?.find(
    (report) => report.path === `/${pagePath.replace('changelogs/', 'stack_reports/')}`,
  );
  return stackReport?.stack_meta?.removal_date ? formatDate(new Date(stackReport.stack_meta.removal_date)) : null;
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

    const xcodeStackListContainer = xcodeStackList.parentElement;
    xcodeStackListContainer.classList.add('stack-list-container');

    const xcodeStackUpdatePolicyNotice = document.createElement('div');
    xcodeStackUpdatePolicyNotice.innerHTML = `<blockquote class="book-hint info">
      <div>
        <strong>macOS stack update policy</strong><br />
        Learn more about how macOS stacks are updated.
      </div>
      <a href="https://docs.bitrise.io/en/bitrise-platform/infrastructure/build-stacks/macos-stack-update-policy.html" target="_blank">Learn more</a>
    </blockquote>`;
    xcodeStackListContainer.appendChild(xcodeStackUpdatePolicyNotice);

    resetScripts.push(() => {
      xcodeStackList.innerHTML = xcodeStackListOriginalContent;
      xcodeStackUpdatePolicyNotice.remove();
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

    const ubuntuStackListContainer = ubuntuStackList.parentElement;
    ubuntuStackListContainer.classList.add('stack-list-container');

    ubuntuStackListContainer.querySelector('.stacks-heading-h3').innerHTML = 'Linux';

    const ubuntuStackUpdatePolicyNotice = document.createElement('div');
    ubuntuStackUpdatePolicyNotice.innerHTML = `<blockquote class="book-hint info">
      <div>
        <strong>Linux stack update policy</strong><br />
        Learn more about how Linux stacks are updated.
      </div>
      <a href="https://docs.bitrise.io/en/bitrise-platform/infrastructure/build-stacks/linux-stack-update-policy.html" target="_blank">Learn more</a>
    </blockquote>`;
    ubuntuStackListContainer.appendChild(ubuntuStackUpdatePolicyNotice);

    resetScripts.push(() => {
      ubuntuStackList.innerHTML = ubuntuStackListOriginalContent;
      ubuntuStackListContainer.remove();
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
          stacksLinks.ubuntu[version].deprecated,
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
          stacksLinks.aws[version].deprecated,
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

    const deprecated = await getStackRemovalDate(pagePath);
    const deprecationNotice = deprecated
      ? `<blockquote class="book-hint warning">
        ⚠️ &nbsp; This stack is deprecated and will be removed on ${deprecated}.
      </blockquote>`
      : '';

    let metaDescription = null;
    if (pageType === 'changelogs') {
      metaDescription = `Last updated: ${formatDate(new Date(data.updated_at))}`;
    } else {
      metaDescription = data.summary ? data.summary.replace(/(<.*?>|\n)/g, '') : null;
    }
    document.title = `${data.title} | Bitrise Stack Updates`;
    document.querySelector("link[rel='canonical']").setAttribute('href', `https://bitrise.io/stacks/${pagePath}`);
    if (metaDescription) setMetaContent({ name: 'description' }, metaDescription);
    setMetaContent({ property: 'og:title' }, `${data.title} | Bitrise Stack Updates`);
    if (metaDescription) setMetaContent({ property: 'og:description' }, metaDescription);
    setMetaContent({ property: 'twitter:title' }, `${data.title} | Bitrise Stack Updates`);
    if (metaDescription) setMetaContent({ property: 'twitter:description' }, metaDescription);

    document.getElementById('stacks-title').innerHTML = data.title;
    document.getElementById('stacks-meta').innerHTML = `${formatDate(new Date(data.updated_at))}`;
    document.getElementById('stacks-content').innerHTML = `${deprecationNotice}${formatHtml(data.content_html)}`;
    postprocessContent();
  } else if (pageType === 'stack_reports') {
    if (pagePath.split('/').length < 2 || pagePath.split('/')[1] === '') {
      window.location.href = '/stacks';
    }

    const response = await fetch(`${stacksAPIBase}${pagePath}/index.json`);
    /** @type {StacksPageData} */
    const data = await response.json();

    const deprecated = await getStackRemovalDate(pagePath);
    const deprecationNotice = deprecated
      ? `<blockquote class="book-hint warning">
        ⚠️ This stack is deprecated and will be removed on ${deprecated}.
      </blockquote>`
      : '';

    let changelogPath = `/stacks/changelogs/${data.stack_id}`;
    if (data.stack_id.match(/^aws/)) {
      if (data.stack_id.match(/^aws-mac-virtualized/)) {
        changelogPath = `/stacks/changelogs/aws/aws-mac-virtualized`;
      } else {
        changelogPath = `/stacks/changelogs/aws/${data.stack_id}`;
      }
    }

    const metaDescription = data.summary ? data.summary.replace(/(<.*?>|\n)/g, '') : null;
    document.title = `${data.stack_name} | Bitrise Stack Updates`;
    document.querySelector("link[rel='canonical']").setAttribute('href', `https://bitrise.io/stacks/${pagePath}`);
    if (metaDescription) setMetaContent({ name: 'description' }, metaDescription);
    setMetaContent({ property: 'og:title' }, `${data.stack_name} | Bitrise Stack Updates`);
    if (metaDescription) setMetaContent({ property: 'og:description' }, metaDescription);
    setMetaContent({ property: 'twitter:title' }, `${data.stack_name} | Bitrise Stack Updates`);
    if (metaDescription) setMetaContent({ property: 'twitter:description' }, metaDescription);

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
      ${deprecationNotice}
      <p>This Bitrise stack contains the following software:</p>
      ${formatHtml(data.content_html)}
    `;
    postprocessContent();
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
