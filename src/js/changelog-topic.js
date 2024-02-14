import ChangelogService from "./changelog/ChangelogService";

const style = document.createElement("style");
document.getElementsByTagName("head")[0].appendChild(style);
style.appendChild(document.createTextNode(require("../css/changelog.css")));

/** 
 * @param {URL} url
 * @returns {?string}
 */
function detectTopicFromUrl(url) {
  let path = url.pathname;
  const match = path.match(/changelog\/(.+)$/);
  if (match) {
    return match[1];
  }
  return null;
}

const url = new URL(document.location.href);
const topicSlugId = detectTopicFromUrl(url);

/** @type {string} */
const apiBase = document.location.hostname.match(/(localhost|127\.0\.0\.1)/) ? "" : "https://bitrise.io";
const changelogService = new ChangelogService(apiBase);

document.getElementById("changelog-topic-title").innerHTML = "<span class='changelog-loading'>Loading</span>";
document.getElementById("changelog-topic-meta").innerHTML = "<span class='changelog-loading'>Loading</span>";
document.getElementById("changelog-topic-content").innerHTML = 
  "<p class='changelog-loading'>Loading</p>" +
  "<p class='changelog-loading'>Loading</p>" +
  "<p class='changelog-loading'>Loading</p>";

changelogService.loadTopic(topicSlugId).then(topic => {

  document.getElementById("changelog-topic-title").innerHTML = topic.fancyTitle;
  document.getElementById("changelog-topic-meta").innerHTML = topic.createdAt.toLocaleDateString();
  document.getElementById("changelog-topic-content").innerHTML = topic.posts[0].cooked;
  document.getElementById("changelog-topic-leave-feedback-button").href = `https://discuss.bitrise.io/t/${topic.slug}/${topic.id}`;
  document.getElementById("changelog-topic-leave-feedback-button").target = "_blank";
});