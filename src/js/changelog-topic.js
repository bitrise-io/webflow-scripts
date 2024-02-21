import ChangelogService from "./changelog/ChangelogService";
import { formatDate, loadCss } from "./common";

loadCss(require("../css/changelog.css"));

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
  document.getElementById("changelog-topic-meta").innerHTML = formatDate(topic.createdAt);
  document.getElementById("changelog-topic-content").innerHTML = topic.posts[0].cooked;

  document.querySelectorAll("#changelog-topic-content .lightbox-wrapper").forEach(lightboxWrapper => {
    const image = lightboxWrapper.querySelector("img");
    const figure = document.createElement("figure");
    figure.appendChild(image);
    lightboxWrapper.replaceWith(figure);
  });

  document.getElementById("changelog-topic-leave-feedback-button").href = `https://discuss.bitrise.io/t/${topic.slug}/${topic.id}`;
  document.getElementById("changelog-topic-leave-feedback-button").target = "_blank";
});