import ChangelogList from "./changelog/ChangelogList";
import ChangelogService from "./changelog/ChangelogService";
import { loadCss } from "./common";

loadCss(require("../css/changelog.css"));

const url = new URL(document.location.href);
const overrideLastVisit = url.searchParams.get("lastVisit");
const queryLoadMore = url.searchParams.get("loadMore");

let lastVisitedDate = new Date();
let newLastVisitDate = lastVisitedDate;

/** @type {string} */
const cookieName = "changelogLastVisit";
const cookiePattern = new RegExp(`${cookieName}=([^;]+);?`);
const cookieMatch = document.cookie.match(cookiePattern);
if (cookieMatch) {
  lastVisitedDate = new Date(decodeURIComponent(cookieMatch[1]));
}

if (overrideLastVisit) {
  lastVisitedDate.setDate(lastVisitedDate.getDate() - parseInt(overrideLastVisit));
  newLastVisitDate = lastVisitedDate;
}

const expires = new Date();
expires.setMonth(expires.getMonth() + 12);
let domain = '.bitrise.io';
if (window.location.host.match('localhost')) domain = null;
const cookieValue = encodeURIComponent(String(newLastVisitDate))
  .replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, decodeURIComponent);
document.cookie = `${cookieName}=${cookieValue};expires=${expires};` + (domain ? `domain=${domain};` : "");

/** @type {string} */
const apiBase = document.location.hostname.match(/(localhost|127\.0\.0\.1)/) ? "" : "https://bitrise.io";
const changelogService = new ChangelogService(apiBase);

const changelogList = new ChangelogList(document.getElementById("changelog-list"));
/** @type {HTMLAnchorElement} */
const changelogLoadMoreButton = document.getElementById("changelog-load-more-button");

/**
 * @param {string} fullUrl 
 */
function renderFullChangelog(fullUrl) {
  changelogService.loadTopics(fullUrl).then(topics => {
    changelogList.render(topics, lastVisitedDate);
    changelogLoadMoreButton.remove();
  });
}

/**
 * @param {string} latestUrl 
 * @param {string} fullUrl 
 * @param {boolean} autoLoad
 */
function renderLatestChangelog(latestUrl, fullUrl, autoLoad) {
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.dispatchEvent(new CustomEvent("click", { target: entry.target }));
        observer.unobserve(entry.target);
      }
    })
  });

  changelogService.loadTopics(latestUrl).then(topics => {
    changelogList.render(topics, lastVisitedDate);
    if (autoLoad) observer.observe(changelogLoadMoreButton);
  });

  changelogLoadMoreButton.addEventListener("click", (event) => {
    event.preventDefault();
    changelogLoadMoreButton.innerHTML = "Loading...";
    changelogLoadMoreButton.disabled = true;
    renderFullChangelog(fullUrl);
  });
}

if (queryLoadMore) {
  renderLatestChangelog("/changelog_latest.json", "/changelog.json", queryLoadMore === "auto");
} else {
  renderFullChangelog("/changelog.json");
}
