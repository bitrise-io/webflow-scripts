import { describe, it, expect } from 'vitest';
import ChangelogTopic from '../../../src/js/changelog/ChangelogTopic';
import {
  ALL_TAGS,
  buildTopicPage,
  parseTopicPath,
  renderDescriptionMeta,
  renderList,
  renderTopicTag,
  unwrapLightboxes,
} from '../../../src/js/changelog/render';

const topic = (overrides = {}) =>
  new ChangelogTopic({
    id: 1,
    title: 'A topic',
    fancy_title: overrides.title || 'A topic :tada:',
    slug: 'a-topic',
    created_at: '2026-11-18T16:19:04.663Z',
    tags: ['new-feature'],
    ...overrides,
  });

describe('renderTopicTag', () => {
  it('picks the most important tag the topic has', () => {
    expect(renderTopicTag(['deprecation', 'feature-update'])).toBe(
      '<div class="tag is-small is-purple">Feature update</div>',
    );
    expect(renderTopicTag(['new-feature'])).toContain('is-purplefilled');
    expect(renderTopicTag(['api-update'])).toContain('is-green');
  });
  it('renders nothing without a known tag', () => {
    expect(renderTopicTag([])).toBe('');
  });
});

describe('ChangelogTopic tags', () => {
  it('reads both plain and object tags (Discourse sends objects for single topics)', () => {
    expect(topic({ tags: [{ id: 1, name: 'new-feature', slug: 'new-feature' }, 'other'] }).tags).toEqual([
      'new-feature',
    ]);
  });
});

describe('renderList', () => {
  const topics = [
    topic({ id: 3, title: 'Newest', created_at: '2026-11-18T10:00:00Z', tags: ['new-feature'] }),
    topic({ id: 2, title: 'Same day', created_at: '2026-11-18T08:00:00Z', tags: ['step-update'] }),
    topic({ id: 1, title: 'Older', created_at: '2026-11-10T08:00:00Z', tags: ['deprecation'] }),
    topic({ id: 0, title: 'RM API', slug: 'rm-v1-1', created_at: '2026-11-09 08:00:00', tags: ['api-update'] }),
    topic({ id: 4, title: 'Untagged', created_at: '2026-11-08T08:00:00Z', tags: [] }),
  ];
  const lastVisit = new Date('2026-11-15T00:00:00Z');

  it('groups topics under their date', () => {
    const html = renderList(topics, lastVisit, { showTags: ALL_TAGS });
    expect(html.match(/changelog-group-timestamp/g)).toHaveLength(3);
    expect(html).toContain(
      '<li class="changelog-group-timestamp text-color-neutral40 text-size-medium">Nov 18, 2026</li>',
    );
  });

  it('marks topics newer than the last visit as unread', () => {
    const html = renderList(topics, lastVisit, { showTags: ALL_TAGS });
    expect(html.match(/changelog-unread/g)).toHaveLength(2);
    expect(html.match(/changelog-read/g)).toHaveLength(2);
    expect(html).toContain('changelog-bullet changelog-bullet-new');
  });

  it('links topics to their pages, Release Management entries without an id', () => {
    const html = renderList(topics, lastVisit, { showTags: ALL_TAGS });
    expect(html).toContain('href="/changelog/a-topic/3"');
    expect(html).toContain('href="/changelog/rm-v1-1"');
  });

  it('leaves out topics without a checked tag, like the filters of the page do', () => {
    expect(renderList(topics, lastVisit, { showTags: ALL_TAGS })).not.toContain('Untagged');
    expect(renderList(topics, lastVisit, { showTags: ['deprecation'] })).not.toContain('Newest');
  });

  it('searches titles case-insensitively', () => {
    const html = renderList(topics, lastVisit, { search: 'SAME', showTags: ALL_TAGS });
    expect(html).toContain('Same day');
    expect(html).not.toContain('Older');
  });

  it('says so when nothing matches', () => {
    expect(renderList(topics, lastVisit, { search: 'zzz' })).toBe(
      '<li class="changelog-no-results">Nothing matches the filters</li>',
    );
  });
});

describe('unwrapLightboxes', () => {
  const wrapper = (inner) =>
    `<div class="lightbox-wrapper"><a class="lightbox" href="/big.png" title="x">${inner}</a></div>`;

  it('keeps only the image of a lightbox', () => {
    const html = wrapper(
      '<img src="/a.png" alt="a" width="1" height="1"><div class="meta"><svg><use href="#x"></use></svg><span>a.png</span></div>',
    );
    expect(unwrapLightboxes(`<p>${html}</p>`)).toBe(
      '<p><figure><img src="/a.png" alt="a" width="1" height="1"></figure></p>',
    );
  });
  it('handles several lightboxes and ones without a caption bar', () => {
    const html = `${wrapper('<img src="/a.png">')}${wrapper('<img src="/b.png"><div class="meta">x</div>')}`;
    expect(unwrapLightboxes(html)).toBe('<figure><img src="/a.png"></figure><figure><img src="/b.png"></figure>');
  });
});

describe('buildTopicPage', () => {
  const discourse = topic({
    post_stream: { posts: [{ id: 1, cooked: '<p>Run <strong>Maestro</strong> tests &amp; more.</p>' }] },
  });

  it('builds a Discourse topic page', () => {
    const view = buildTopicPage(discourse);
    expect(view.title).toBe('A topic | Bitrise Changelog');
    expect(view.description).toBe('Run Maestro tests & more.');
    expect(view.canonical).toBe('https://bitrise.io/changelog/a-topic/1');
    expect(view.titleHtml).toContain('<img src="https://emoji.discourse-cdn.com/twitter/tada.png');
    expect(view.metaHtml).toBe('Nov 18, 2026');
    expect(view.tagHtml).toContain('is-purplefilled');
    expect(view.contentHtml).toContain('<strong>Maestro</strong>');
    expect(view.isApiTopic).toBe(false);
    expect(view.feedbackUrl).toBe('https://discuss.bitrise.io/t/a-topic/1');
    expect(view.footerText).toBeNull();
  });

  it('builds a Release Management API entry', () => {
    const api = new ChangelogTopic({
      id: 0,
      title: 'Release Management API V1 Update',
      fancy_title: 'Release Management API V1 Update',
      slug: 'rm-v1-12112026092805',
      created_at: '2026-11-12 09:28:05',
      tags: ['api-update'],
      changelog: [{ operationId: 'CreateDraft', operation: 'POST', path: '/drafts', text: "added 'schema'" }],
    });
    const view = buildTopicPage(api);
    expect(view.canonical).toBe('https://bitrise.io/changelog/rm-v1-12112026092805');
    expect(view.contentHtml).toContain('rmcl-http-method-post');
    expect(view.contentHtml).toContain('<span class="rmcl-inline-code">schema</span>');
    expect(view.isApiTopic).toBe(true);
    expect(view.footerText).toBe('Read more on Release Management API');
    expect(view.feedbackLabel).toBe('API Documentation');
    expect(view.feedbackUrl).toContain('api-docs');
  });
});

describe('renderDescriptionMeta', () => {
  it('escapes the description for use in attributes', () => {
    const html = renderDescriptionMeta('Say "hi" <now>');
    expect(html).toContain('name="description" content="Say &quot;hi&quot; &lt;now&gt;"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('name="twitter:description"');
  });
  it('renders nothing for an empty description', () => {
    expect(renderDescriptionMeta('')).toBe('');
  });
});

describe('parseTopicPath', () => {
  it('recognises Discourse topics', () => {
    expect(parseTopicPath('some-slug/12345')).toEqual({
      kind: 'discourse',
      slug: 'some-slug',
      path: 'some-slug/12345',
    });
    expect(parseTopicPath('some-slug/12345/')).toEqual({
      kind: 'discourse',
      slug: 'some-slug',
      path: 'some-slug/12345',
    });
  });
  it('recognises Release Management API entries, with or without /0', () => {
    expect(parseTopicPath('rm-v2-apps-12112026092805')).toEqual({
      kind: 'api',
      slug: 'rm-v2-apps-12112026092805',
      path: 'rm-v2-apps-12112026092805',
    });
    expect(parseTopicPath('rm-v1-1/0').slug).toBe('rm-v1-1');
  });
  it('rejects anything else', () => {
    ['api/t/x/1.json', '../x', '..', 'a/b/c', 'a/notanumber', ''].forEach((path) => {
      expect(parseTopicPath(path)).toBeNull();
    });
  });
});
