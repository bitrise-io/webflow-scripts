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

/** */
function loadMore() {
  changelogLoadMoreButton.disabled = true;
  changelogLoadMoreButton.innerHTML = "Loading...";
  changelogService.loadMore().then(topics => {
    changelogList.render(topics);
    changelogLoadMoreButton.disabled = false;
    changelogLoadMoreButton.innerHTML = "Load more...";

    if (!changelogService.isMore) {
      changelogLoadMoreButton.remove();
    }
  });
}

changelogLoadMoreButton.addEventListener('click', event => {
  event.preventDefault();
  loadMore();
});

loadMore();
