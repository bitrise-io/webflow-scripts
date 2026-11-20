import hljs from '@highlightjs/cdn-assets/es/highlight.js';
import '../css/hljs.css'; // import '@highlightjs/cdn-assets/styles/vs2015.css';

import YouTubeLoader from './changelog/YouTubeLoader';
import { detectTopicFromUrl } from './shared/common';
import { setDocumentContext } from './shared/context';

import '../css/changelog.css';
import { CHANGELOG_PATH_PREFIX, CHANGELOG_SUBPAGE_PARAM_NAME } from './changelog/config';

setDocumentContext(document, document.location.hostname);

const youTubeLoader = new YouTubeLoader();

const content = document.getElementById('changelog-topic-content');

if (content.dataset.ssr === 'true') {
  // The worker already rendered the topic (title, meta tags, tag, content, footer). What is left needs the browser:
  // embedding videos at the width of the page, and highlighting code.
  if (content.dataset.topicKind === 'discourse') {
    youTubeLoader.loadVideos();

    document.querySelectorAll('pre code').forEach((block) => {
      block.className = '';
      hljs.highlightElement(block);
    });
  }
} else {
  // Only the worker can read the topic, so a page it did not render (a staging site, a topic it could not load)
  // goes to the production page, which it does render.
  const url = new URL(document.location.href);
  const topicSlugId = detectTopicFromUrl(url, CHANGELOG_PATH_PREFIX, CHANGELOG_SUBPAGE_PARAM_NAME);
  const isProduction = document.location.hostname.match(/^(app\.)?bitrise\.io$/);
  if (topicSlugId && !isProduction) window.location.replace(`https://bitrise.io/changelog/${topicSlugId}`);
  else window.location.replace('/changelog');
}

if (import.meta.webpackHot) {
  import.meta.webpackHot.dispose(() => {
    youTubeLoader.reset();
  });
  import.meta.webpackHot.accept();
}
