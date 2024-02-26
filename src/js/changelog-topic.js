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

class ChangelogTopicDetails
{
  constructor() {
    /** @type {HTMLDivElement} */
    this.tagPurpleFilledTemplate = document.querySelector("#changelog-tag-purple-filled");
    this.tagPurpleFilledTemplate.id = "";
    this.tagPurpleFilledTemplate.remove();

    /** @type {HTMLDivElement} */
    this.tagPurpleTemplate = document.querySelector("#changelog-tag-purple");
    this.tagPurpleTemplate.id = "";
    this.tagPurpleTemplate.remove();

    /** @type {HTMLDivElement} */
    this.tagBlueTemplate = document.querySelector("#changelog-tag-blue");
    this.tagBlueTemplate.id = "";
    this.tagBlueTemplate.remove();

    /** @type {HTMLDivElement} */
    this.tagYelowTemplate = document.querySelector("#changelog-tag-yellow");
    this.tagYelowTemplate.id = "";
    this.tagYelowTemplate.remove();

    /** @type {HTMLDivElement} */
    this.topicMetaSeparator = document.querySelector("#changelog-topic-meta-separator");
    this.topicMetaSeparator.style.display = "none";
  }
}

const url = new URL(document.location.href);
const topicSlugId = detectTopicFromUrl(url);

/** @type {string} */
const apiBase = document.location.hostname.match(/(localhost|127\.0\.0\.1)/) ? "" : "https://bitrise.io";
const changelogService = new ChangelogService(apiBase);

const changelogTopicDetails = new ChangelogTopicDetails();

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