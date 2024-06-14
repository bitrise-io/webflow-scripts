import ChangelogService from './changelog/ChangelogService';
import ChangelogTagFactory from './changelog/ChangelogTagFactory';
import { detectTopicFromUrl, formatDate, setMetaContent } from './shared/common';

import '../css/changelog.css';

const tagFactory = new ChangelogTagFactory();

/** @type {HTMLDivElement} */
const topicMetaSeparator = document.querySelector('#changelog-topic-meta-separator');
topicMetaSeparator.style.display = 'none';

const url = new URL(document.location.href);
const topicSlugId = detectTopicFromUrl(url, 'changelog');

/** @type {string} */
const apiBase = document.location.hostname.match(/(localhost|127\.0\.0\.1)/) ? '' : 'https://bitrise.io';
const changelogService = new ChangelogService(apiBase);

document.getElementById('changelog-topic-title').innerHTML = "<span class='changelog-loading'>Loading</span>";
document.getElementById('changelog-topic-meta').innerHTML = "<span class='changelog-loading'>Loading</span>";
document.getElementById('changelog-topic-content').innerHTML =
  "<p class='changelog-loading'>Loading</p>" +
  "<p class='changelog-loading'>Loading</p>" +
  "<p class='changelog-loading'>Loading</p>";

changelogService.loadTopic(topicSlugId).then((topic) => {
  document.title = `${topic.title} | Bitrise Changelog`;
  document
    .querySelector("link[rel='canonical']")
    .setAttribute('href', `https://bitrise.io/changelog/${topic.slug}/${topic.id}`);
  // setMetaContent({name: "description"}, step.summary.replace(/\s+/g, " "));
  setMetaContent({ property: 'og:title' }, `${topic.title} | Bitrise Changelog`);
  // setMetaContent({property: "og:description"}, step.summary.replace(/\s+/g, " "));
  // setMetaContent({property: "og:image"}, step.svgIcon);
  setMetaContent({ property: 'twitter:title' }, `${topic.title} | Bitrise Changelog`);
  // setMetaContent({property: "twitter:description"}, step.summary.replace(/\s+/g, " "));
  // setMetaContent({property: "twitter:image"}, step.svgIcon);

  document.getElementById('changelog-topic-title').innerHTML = topic.fancyTitle;
  document.getElementById('changelog-topic-meta').innerHTML = formatDate(topic.createdAt);

  const listItemTag = tagFactory.getTopicTag(topic.tags);
  if (listItemTag) {
    document.querySelector('.changelog-tag-placeholder').replaceWith(listItemTag);
    topicMetaSeparator.style.display = 'block';
  }

  document.getElementById('changelog-topic-content').innerHTML = topic.content;

  document.querySelectorAll('#changelog-topic-content .lightbox-wrapper').forEach((lightboxWrapper) => {
    const image = lightboxWrapper.querySelector('img');
    const figure = document.createElement('figure');
    figure.appendChild(image);
    lightboxWrapper.replaceWith(figure);
  });

  document.getElementById('changelog-topic-leave-feedback-button').href =
    `https://discuss.bitrise.io/t/${topic.slug}/${topic.id}`;
  document.getElementById('changelog-topic-leave-feedback-button').target = '_blank';
});

if (import.meta.webpackHot) {
  import.meta.webpackHot.dispose(() => {
    tagFactory.reset();
  });
  import.meta.webpackHot.accept();
}
