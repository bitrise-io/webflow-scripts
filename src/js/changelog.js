import ChangelogList from "./changelog/ChangelogList";
import ChangelogService from "./changelog/ChangelogService";
import { loadCss } from "./common";

loadCss(require("../css/changelog.css"));

const now = new Date();
let lastVisitedDate = now;

/** @type {string} */
const cookieName = "changelogLastVisit";
const cookiePattern = new RegExp(`${cookieName}=([^;]+);?`);
const cookieMatch = document.cookie.match(cookiePattern);
if (cookieMatch) lastVisitedDate = new Date(cookieMatch[1]);

const expires = new Date();
expires.setMonth(expires.getMonth() + 12);
document.cookie = `${cookieName}=${now};expires=${expires};`;

const url = new URL(document.location.href);
const queryLastVisit = url.searchParams.get("lastVisit");
if (queryLastVisit) {
  lastVisitedDate = new Date();
  lastVisitedDate.setDate(lastVisitedDate.getDate() - parseInt(queryLastVisit));
}
const queryLoadMore = url.searchParams.get("loadMore");

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
