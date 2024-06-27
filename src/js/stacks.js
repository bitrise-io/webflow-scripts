import { detectTopicFromUrl, fancyConsoleLog } from './shared/common';

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
    const response = await fetch(`${stacksAPIBase}index.html`);
    /** @type {StacksPageData} */
    const html = await response.text();
    const match = html.match(/<main.*\/main>/gms);

    const dataContainerId = 'stacks-data-container';
    let dataContainer = document.getElementById(dataContainerId);
    if (!dataContainer) {
      dataContainer = document.createElement('div');
      dataContainer.style.display = 'none';
      dataContainer.id = dataContainerId;
      document.querySelector('body').append(dataContainer);
    }
    [dataContainer.innerHTML] = match;

    const stacksLinks = {
      announcements: {},
      xcode: {},
      ubuntu: {},
      aws: {},
      tools: {},
      tips: {},
    };

    const xcodeStackList = document.getElementById('xcode-stack-list');
    const xcodeStableOnlyStack = document.getElementById('xcode-stable-only').cloneNode(true);
    xcodeStableOnlyStack.removeAttribute('id');
    const xcodeStableAndEdgeStack = document.getElementById('xcode-stable-and-edge').cloneNode(true);
    xcodeStableAndEdgeStack.removeAttribute('id');
    const xcodeEdgeOnlyStack = document.getElementById('xcode-edge-only').cloneNode(true);
    xcodeEdgeOnlyStack.removeAttribute('id');
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

    [...dataContainer.querySelectorAll('a')]
      .map((link) => {
        return [new URL(link.href).pathname.replace(/\/$/, ''), link.innerHTML];
      })
      .forEach(([pathname, title]) => {
        const announcementsMatch = pathname.match(/announcements\/([^/]+)/);
        if (announcementsMatch) {
          stacksLinks.announcements[announcementsMatch[1]] = [pathname, title];
        }
        const toolsMatch = pathname.match(/tools\/([^/]+)/);
        if (toolsMatch) {
          stacksLinks.tools[toolsMatch[1]] = [pathname, title];
        }
        const tipsMatch = pathname.match(/tips\/([^/]+)/);
        if (tipsMatch) {
          stacksLinks.tips[tipsMatch[1]] = [pathname, title];
        }
        const awsMatch = pathname.match(/(stack_reports|changelogs)\/aws\/([^/]+)/);
        if (awsMatch) {
          const page = awsMatch[1];
          const version = awsMatch[2];
          if (!stacksLinks.aws[version]) stacksLinks.aws[version] = {};
          stacksLinks.aws[version].title = title.replace(/ changelogs?/, '').trim();
          stacksLinks.aws[version][page] = pathname;
        }
        const xcodeMatch = pathname.match(/(stack_reports|changelogs)\/([^/]+xcode[^/]+)/);
        if (xcodeMatch) {
          const page = xcodeMatch[1];
          const edge = xcodeMatch[2].match(/-edge/) ? 'edge' : 'stable';
          const version = xcodeMatch[2].replace(/-edge/, '');
          if (!stacksLinks.xcode[version]) stacksLinks.xcode[version] = {};
          if (!stacksLinks.xcode[version][edge]) stacksLinks.xcode[version][edge] = {};
          stacksLinks.xcode[version].title = title.replace(/ with edge updates| changelogs?/, '').trim();
          stacksLinks.xcode[version][edge][page] = pathname;
        }
        const ubuntuMatch = pathname.match(/(stack_reports|changelogs)\/(linux[^/]+)/);
        if (ubuntuMatch) {
          const page = ubuntuMatch[1];
          const version = ubuntuMatch[2];
          if (!stacksLinks.ubuntu[version]) stacksLinks.ubuntu[version] = {};
          stacksLinks.ubuntu[version].title = title.replace(/ changelogs?/, '').trim();
          stacksLinks.ubuntu[version][page] = pathname;
        }
      });

    dataContainer.remove();

    Object.keys(stacksLinks.xcode)
      .sort()
      .forEach((version, index) => {
        if (!stacksLinks.xcode[version].edge) {
          const row = xcodeStableOnlyStack.cloneNode(true);
          row.style.removeProperty('display');
          row.querySelector('.stack-version-title').innerHTML = stacksLinks.xcode[version].title;
          row.querySelectorAll('.stack-links')[0].querySelector('.stack-link-reports').href =
            `/stacks${stacksLinks.xcode[version].stable.stack_reports}`;
          row.querySelectorAll('.stack-links')[0].querySelector('.stack-link-changelogs').href =
            `/stacks${stacksLinks.xcode[version].stable.changelogs}`;
          row.className = row.className.replace('stack-row-odd', '');
          if (index % 2) row.className += ' stack-row-odd';
          xcodeStackList.appendChild(row);
        } else if (!stacksLinks.xcode[version].stable) {
          const row = xcodeEdgeOnlyStack.cloneNode(true);
          row.style.removeProperty('display');
          row.querySelector('.stack-version-title').innerHTML = stacksLinks.xcode[version].title;
          row.querySelectorAll('.stack-links')[1].querySelector('.stack-link-reports').href =
            `/stacks${stacksLinks.xcode[version].edge.stack_reports}`;
          row.querySelectorAll('.stack-links')[1].querySelector('.stack-link-changelogs').href =
            `/stacks${stacksLinks.xcode[version].edge.changelogs}`;
          row.className = row.className.replace('stack-row-odd', '');
          if (index % 2) row.className += ' stack-row-odd';
          xcodeStackList.appendChild(row);
        } else {
          const row = xcodeStableAndEdgeStack.cloneNode(true);
          row.style.removeProperty('display');
          row.querySelector('.stack-version-title').innerHTML = stacksLinks.xcode[version].title;
          row.querySelectorAll('.stack-links')[0].querySelector('.stack-link-reports').href =
            `/stacks${stacksLinks.xcode[version].stable.stack_reports}`;
          row.querySelectorAll('.stack-links')[0].querySelector('.stack-link-changelogs').href =
            stacksLinks.xcode[version].stable.changelogs;
          row.querySelectorAll('.stack-links')[1].querySelector('.stack-link-reports').href =
            `/stacks${stacksLinks.xcode[version].edge.stack_reports}`;
          row.querySelectorAll('.stack-links')[1].querySelector('.stack-link-changelogs').href =
            `/stacks${stacksLinks.xcode[version].edge.changelogs}`;
          row.className = row.className.replace('stack-row-odd', '');
          if (index % 2) row.className += ' stack-row-odd';
          xcodeStackList.appendChild(row);
        }
      });

    Object.keys(stacksLinks.ubuntu)
      .sort()
      .forEach((version, index) => {
        const row = ubuntuStack.cloneNode(true);
        row.style.removeProperty('display');
        row.querySelector('.stack-version-title').innerHTML = stacksLinks.ubuntu[version].title;
        row.querySelectorAll('.stack-links')[0].querySelector('.stack-link-reports').href =
          `/stacks${stacksLinks.ubuntu[version].stack_reports}`;
        row.querySelectorAll('.stack-links')[0].querySelector('.stack-link-changelogs').href =
          `/stacks${stacksLinks.ubuntu[version].changelogs}`;
        row.className = row.className.replace('stack-row-odd', '');
        if (index % 2) row.className += ' stack-row-odd';
        ubuntuStackList.appendChild(row);
      });

    Object.keys(stacksLinks.aws)
      .sort()
      .forEach((version, index) => {
        const row = awsStack.cloneNode(true);
        row.style.removeProperty('display');
        row.querySelector('.stack-version-title').innerHTML = stacksLinks.aws[version].title;
        row.querySelectorAll('.stack-links')[0].querySelector('.stack-link-reports').href =
          `/stacks${stacksLinks.aws[version].stack_reports}`;
        row.querySelectorAll('.stack-links')[0].querySelector('.stack-link-changelogs').href =
          `/stacks${stacksLinks.aws[version].changelogs}`;
        row.className = row.className.replace('stack-row-odd', '');
        if (index % 2) row.className += ' stack-row-odd';
        awsStackList.appendChild(row);
      });

    console.log(stacksLinks);
  } else if (pageType === 'changelogs' || pageType === 'announcements' || pageType === 'tools' || pageType === 'tips') {
    const response = await fetch(`${stacksAPIBase}${pagePath}/index.json`);
    /** @type {StacksPageData} */
    const data = await response.json();

    document.getElementById('stacks-title').innerHTML = data.title;
    document.getElementById('stacks-content').innerHTML = `
      <div id="stacks-meta">
        <p><strong>${new Date(data.updated_at).toLocaleDateString()}</strong></p>
      </div>

      ${formatHtml(data.content_html)}
    `;
  } else if (pageType === 'stack_reports') {
    const response = await fetch(`${stacksAPIBase}${pagePath}/index.json`);
    /** @type {StacksPageData} */
    const data = await response.json();

    document.getElementById('stacks-title').innerHTML = data.stack_name;
    document.getElementById('stacks-content').innerHTML = `
      <div id="stacks-meta">
        <p>Stack ID: <code>${data.stack_id}</code></p>
        <p>Current stack revision: <code>${data.stack_revision}</code></p>
        <div class="button-group">
          <a href="/stacks/changelogs/${data.stack_id}" title="Changelogs" class="button is-xsmall is-secondary">Changelogs</a>
          <a href="https://github.com/bitrise-io/stacks/commits/main/data/${data.stack_id}" target="_blank" title="Update history" class="button is-xsmall is-secondary">Update history</a>
          <a href="/stacks/tips/get-notified" title="Get notified" class="button is-xsmall is-secondary">Get notified</a>
        </div>
        <p>This Bitrise stack contains the following software:</p>
      </div>
      
      ${formatHtml(data.content_html)}
    `;
  } else {
    console.log(pageType);
  }

  fancyConsoleLog('Bitrise.io Stacks');
})();

if (import.meta.webpackHot) import.meta.webpackHot.accept();
