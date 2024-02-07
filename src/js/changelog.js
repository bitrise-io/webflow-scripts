import ChangelogList from "./changelog/ChangelogList";
import ChangelogService from "./changelog/ChangelogService";

const style = document.createElement("style");
document.getElementsByTagName("head")[0].appendChild(style);
style.appendChild(document.createTextNode(require("../css/changelog.css")));

/** @type {string} */
const apiBase = document.location.hostname.match(/(localhost|127\.0\.0\.1)/) ? "" : "https://bitrise.io";
const changelogService = new ChangelogService(apiBase);

const changelogList = new ChangelogList(document.getElementById("changelog-list"));
/** @type {HTMLAnchorElement} */
const changelogLoadMoreButton = document.getElementById("changelog-load-more-button");

changelogLoadMoreButton.remove();
changelogService.loadTopics("/changelog.json").then(topics => {
  changelogList.render(topics);
});
