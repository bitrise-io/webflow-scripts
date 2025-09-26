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

/** @type {HTMLElement} */
const changelogList = new ChangelogList(document.getElementById('changelog-list'));

/** @type {HTMLAnchorElement} */
const changelogLoadMoreButton = document.getElementById('changelog-load-more-button');

/** @type {HTMLElement} */
const changelogSettingsTrigger = document.querySelector('.changelog-settings-trigger');

/** @type {HTMLElement} */
const changelogSettingsContainer = document.querySelector('.changelog-settings-container');

/** @type {HTMLInputElement} */
const changelogSettingsInput = document.querySelector('#changelog-search');
if (changelogSettingsInput)
  changelogSettingsInput.addEventListener(
    'keydown',
    (e) => {
      if (e.keyIdentifier === 'U+000A' || e.keyIdentifier === 'Enter' || e.keyCode === 13) {
        if (e.target.nodeName === 'INPUT' && e.target.type === 'text') {
          e.preventDefault();
          return false;
        }
      }
    },
    true,
  );

/** @type {HTMLInputElement[]} */
const changelogFilterRadios = document.querySelectorAll('.changelog-settings-container input[name="changelog-filter"]');

/** @returns {{search: string, showTags: string[]}} */
const getChangelogSettings = () => {
  return {
    search: changelogSettingsInput ? changelogSettingsInput.value : '',
    showTags: Array.from(changelogFilterRadios)
      .filter((r) => r.checked)
      .map((r) => r.id.replace('changelog-filter-', '')),
  };
};

/**
 * @param {string} fullUrl
 */
const renderFullChangelog = async (fullUrl) => {
  const topics = await changelogService.loadTopics(fullUrl);
  changelogList.render(topics, lastVisitDate, getChangelogSettings());
};

const loadMoreClickHandler = async (event) => {
  if (event) event.preventDefault();

  const oldButtonLabel = changelogLoadMoreButton.innerHTML;
  changelogLoadMoreButton.innerHTML = 'Loading...';
  changelogLoadMoreButton.disabled = true;

  await renderFullChangelog('/changelog.json');

  changelogLoadMoreButton.disabled = false;
  changelogLoadMoreButton.innerHTML = oldButtonLabel;
  changelogLoadMoreButton.style.setProperty('display', 'none');
};

// const observer = new IntersectionObserver((entries) => {
//   entries.forEach((entry) => {
//     if (entry.isIntersecting) {
//       changelogLoadMoreButton.dispatchEvent(new CustomEvent('click', { target: entry.target }));
//       observer.unobserve(changelogLoadMoreButton);
//     }
//   });
// });

/**
 * @param {string} latestUrl
 */
const renderLatestChangelog = async (latestUrl) => {
  const topics = await changelogService.loadTopics(latestUrl);
  changelogList.render(topics, lastVisitDate, getChangelogSettings());
};

const changelogSettingsTriggerClickHandler = () => {
  if (changelogSettingsContainer.style.display === 'none' || !changelogSettingsContainer.style.display) {
    changelogSettingsContainer.style.display = 'block';
  } else {
    changelogSettingsContainer.style.display = 'none';
  }
};

const changelogSettingsChangeHandler = () => {
  if (
    changelogLoadMoreButton &&
    !changelogLoadMoreButton.disabled &&
    changelogLoadMoreButton.style.display !== 'none'
  ) {
    renderLatestChangelog('/changelog_latest.json');
    loadMoreClickHandler();
  } else {
    renderFullChangelog('/changelog.json');
  }
};

renderLatestChangelog('/changelog_latest.json');
// observer.observe(changelogLoadMoreButton);
if (changelogLoadMoreButton) changelogLoadMoreButton.addEventListener('click', loadMoreClickHandler);

if (changelogSettingsTrigger) changelogSettingsTrigger.addEventListener('click', changelogSettingsTriggerClickHandler);
if (changelogSettingsInput) changelogSettingsInput.addEventListener('input', changelogSettingsChangeHandler);

changelogFilterRadios.forEach((radio) => {
  radio.addEventListener('change', changelogSettingsChangeHandler);
});

if (import.meta.webpackHot) {
  import.meta.webpackHot.dispose(() => {
    changelogList.reset();
    // observer.unobserve(changelogLoadMoreButton);
    if (changelogLoadMoreButton) {
      changelogLoadMoreButton.removeEventListener('click', loadMoreClickHandler);
      changelogLoadMoreButton.style.removeProperty('display');
    }
    if (changelogSettingsTrigger)
      changelogSettingsTrigger.removeEventListener('click', changelogSettingsTriggerClickHandler);
    if (changelogSettingsInput) changelogSettingsInput.removeEventListener('input', changelogSettingsChangeHandler);
    changelogFilterRadios.forEach((radio) => {
      radio.removeEventListener('change', changelogSettingsChangeHandler);
    });
  });
  import.meta.webpackHot.accept();
}
