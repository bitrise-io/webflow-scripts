import ChangelogList from "./changelog/ChangelogList";
import ChangelogService from "./changelog/ChangelogService";
import { loadCss } from "./common";

loadCss(require("../css/changelog.css"));

/** @type {string} */
const apiBase = document.location.hostname.match(/(localhost|127\.0\.0\.1)/) ? "" : "https://bitrise.io";
const changelogService = new ChangelogService(apiBase);

const changelogList = new ChangelogList(document.getElementById("changelog-list"));
/** @type {HTMLAnchorElement} */
const changelogLoadMoreButton = document.getElementById("changelog-load-more-button");

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
const queryLAstVisit = url.searchParams.get("lastVisit");
if (queryLAstVisit) {
  lastVisitedDate = new Date();
  lastVisitedDate.setDate(lastVisitedDate.getDate() - parseInt(queryLAstVisit));
}

/* -- TEST -- */
// const testDate = new Date();
// testDate.setMonth(testDate.getMonth() - 1);
// lastVisitedDate = testDate;
/* -- TEST -- */

changelogLoadMoreButton.remove();
changelogService.loadTopics("/changelog.json").then(topics => {
  changelogList.render(topics, lastVisitedDate);
});});
