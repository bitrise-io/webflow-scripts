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

ChangelogService.loadTopic(topicSlugId).then(topic => {

  document.getElementById("changelog-topic-title").innerHTML = topic.fancyTitle;
  document.getElementById("changelog-topic-meta").innerHTML = topic.createdAt.toLocaleDateString();
  document.getElementById("changelog-topic-content").innerHTML = topic.posts[0].cooked;
});