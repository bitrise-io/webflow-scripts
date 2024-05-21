import ChangelogList from './changelog/ChangelogList';
import ChangelogService from './changelog/ChangelogService';

import '../css/changelog.css';

const url = new URL(document.location.href);
const overrideLastVisit = url.searchParams.get('lastVisit');

let lastVisitDate = new Date();
const newLastVisitDate = new Date();

/** @type {string} */
const cookieName = 'changelogLastVisit';
const cookiePattern = new RegExp(`${cookieName}=([^;]+);?`);
const cookieMatch = document.cookie.match(cookiePattern);
if (cookieMatch) {
  lastVisitDate = new Date(decodeURIComponent(cookieMatch[1]));
}

if (overrideLastVisit) {
  newLastVisitDate.setDate(newLastVisitDate.getDate() - parseInt(overrideLastVisit, 10));
  lastVisitDate = new Date(newLastVisitDate);
}

const expires = new Date();
expires.setMonth(expires.getMonth() + 12);
let domain = '.bitrise.io';
if (window.location.host.match('localhost')) domain = null;
const cookieValue = encodeURIComponent(String(newLastVisitDate)).replace(
  /%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g,
  decodeURIComponent,
);
document.cookie = `${cookieName}=${cookieValue};expires=${expires};${domain ? `domain=${domain};` : ''}`;

/** @type {string} */
const apiBase = document.location.hostname.match(/(localhost|127\.0\.0\.1)/) ? '' : 'https://bitrise.io';
const changelogService = new ChangelogService(apiBase);

const changelogList = new ChangelogList(document.getElementById('changelog-list'));
/** @type {HTMLAnchorElement} */
const changelogLoadMoreButton = document.getElementById('changelog-load-more-button');

/**
 * @param {string} fullUrl
 */
const renderFullChangelog = async (fullUrl) => {
  const topics = await changelogService.loadTopics(fullUrl);
  changelogList.render(topics, lastVisitDate);
};

const loadMoreClickHandler = async (event) => {
  event.preventDefault();

  const oldButtonLabel = changelogLoadMoreButton.innerHTML;
  changelogLoadMoreButton.innerHTML = 'Loading...';
  changelogLoadMoreButton.disabled = true;

  await renderFullChangelog('/changelog.json');

  changelogLoadMoreButton.disabled = false;
  changelogLoadMoreButton.innerHTML = oldButtonLabel;
  changelogLoadMoreButton.style.setProperty('display', 'none');
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      changelogLoadMoreButton.dispatchEvent(new CustomEvent('click', { target: entry.target }));
      observer.unobserve(changelogLoadMoreButton);
    }
  });
});

/**
 * @param {string} latestUrl
 * @param {boolean} autoLoad
 */
const renderLatestChangelog = async (latestUrl, autoLoad) => {
  const topics = await changelogService.loadTopics(latestUrl);
  changelogList.render(topics, lastVisitDate);

  if (autoLoad) observer.observe(changelogLoadMoreButton);

  changelogLoadMoreButton.addEventListener('click', loadMoreClickHandler);
};

renderLatestChangelog('/changelog_latest.json', false);

if (import.meta.webpackHot) {
  import.meta.webpackHot.dispose(() => {
    changelogList.reset();
    observer.unobserve(changelogLoadMoreButton);
    changelogLoadMoreButton.removeEventListener('click', loadMoreClickHandler);
    changelogLoadMoreButton.style.removeProperty('display');
  });
  import.meta.webpackHot.accept();
}
