import { describe, it, expect } from 'vitest';
import {
  buildPage,
  detailPageType,
  findStackRemovalDate,
  formatHtml,
  formatIsoDate,
  needsRemovalDate,
} from '../../../src/js/stacks/render';

const indexJson = {
  sections: [
    {
      stack_reports: [
        { path: '/stack_reports/osx-old', stack_meta: { removal_date: '2027-09-15' } },
        { path: '/stack_reports/osx-new', stack_meta: { removal_date: null } },
      ],
    },
  ],
};

describe('formatIsoDate', () => {
  it('uses the published calendar date regardless of offset', () => {
    expect(formatIsoDate('2026-11-17T17:16:53-06:00')).toBe('Nov 17, 2026');
    expect(formatIsoDate('2027-09-15')).toBe('Sep 15, 2027');
  });
  it('returns an empty string for garbage', () => {
    expect(formatIsoDate('soon')).toBe('');
  });
});

describe('detailPageType', () => {
  it('recognises detail pages only', () => {
    expect(detailPageType('stack_reports/osx-xcode-26.0.x')).toBe('stack_reports');
    expect(detailPageType('changelogs/aws/aws-mac')).toBe('changelogs');
    expect(detailPageType('changelogs')).toBeNull();
    expect(detailPageType('subpage')).toBeNull();
    expect(detailPageType('')).toBeNull();
  });
  it('accepts nested paths and rejects anything that is not a plain path segment', () => {
    expect(detailPageType('changelogs/aws/aws-mac-virtualized')).toBe('changelogs');
    expect(detailPageType('tools/node.js')).toBe('tools');
    ['changelogs/..', 'changelogs/../../x', 'changelogs/.', 'changelogs/a//b', 'changelogs/a%2F..', 'tips/a b'].forEach(
      (path) => expect(detailPageType(path)).toBeNull(),
    );
  });
  it('knows which pages need the removal date', () => {
    expect(needsRemovalDate('changelogs')).toBe(true);
    expect(needsRemovalDate('stack_reports')).toBe(true);
    expect(needsRemovalDate('tips')).toBe(false);
  });
});

describe('formatHtml', () => {
  it('points links at the proxied stacks pages', () => {
    const html = formatHtml(
      '<a href="/tips/x">a</a><a href="https://bitrise-io.github.io/stacks/tools/y">b</a><a href="https://stacks.bitrise.io/z">c</a>',
    );
    expect(html).toContain('href="/stacks/tips/x"');
    expect(html).toContain('href="/stacks/tools/y"');
    expect(html).toContain('href="/stacks/z"');
  });
});

describe('findStackRemovalDate', () => {
  it('finds the date for a stack report and its changelog', () => {
    expect(findStackRemovalDate('stack_reports/osx-old', indexJson)).toBe('Sep 15, 2027');
    expect(findStackRemovalDate('changelogs/osx-old', indexJson)).toBe('Sep 15, 2027');
  });
  it('returns null without a date or index', () => {
    expect(findStackRemovalDate('stack_reports/osx-new', indexJson)).toBeNull();
    expect(findStackRemovalDate('stack_reports/osx-old', null)).toBeNull();
  });
});

describe('buildPage', () => {
  const report = {
    stack_name: 'Xcode 16.0',
    stack_id: 'osx-old',
    stack_flavor: 'stable',
    stack_revision: 'v1',
    summary: '<p>macOS stack\nfor Xcode</p>',
    updated_at: '2026-11-17T17:16:53-06:00',
    notice_html: null,
    content_html: '<h2>Tools</h2>',
  };

  it('builds a stack report with title, description, canonical and deprecation notice', () => {
    const view = buildPage('stack_reports/osx-old', report, indexJson, { github: '<svg/>' });
    expect(view.title).toBe('Xcode 16.0 | Bitrise Stack Updates');
    expect(view.description).toBe('macOS stackfor Xcode');
    expect(view.canonical).toBe('https://bitrise.io/stacks/stack_reports/osx-old');
    expect(view.titleHtml).toContain('is-stable');
    expect(view.metaHtml).toContain('<code>osx-old</code>');
    expect(view.metaHtml).toContain('href="/stacks/changelogs/osx-old"');
    expect(view.metaHtml).toContain('<svg/>');
    expect(view.contentHtml).toContain('deprecated and will be removed on Sep 15, 2027');
    expect(view.contentHtml).toContain('<h2>Tools</h2>');
  });

  it('skips the deprecation notice when the report has its own notice', () => {
    const view = buildPage('stack_reports/osx-old', { ...report, notice_html: '<p>frozen</p>' }, indexJson);
    expect(view.contentHtml).not.toContain('will be removed on');
    expect(view.contentHtml).toContain('<p>frozen</p>');
  });

  it('does not print "undefined" when there is no stack revision', () => {
    const view = buildPage('stack_reports/osx-new', { ...report, stack_revision: undefined }, indexJson);
    expect(view.metaHtml).not.toContain('undefined');
  });

  it('routes AWS stacks to their changelog', () => {
    const view = buildPage('stack_reports/aws/aws-x', { ...report, stack_id: 'aws-x' }, indexJson);
    expect(view.metaHtml).toContain('href="/stacks/changelogs/aws/aws-x"');
  });

  it('builds a changelog with a last-updated description', () => {
    const view = buildPage(
      'changelogs/osx-old',
      { title: 'Xcode 16.0 changelog', updated_at: '2026-11-17T17:16:53-06:00', content_html: '<p>x</p>' },
      indexJson,
    );
    expect(view.description).toBe('Last updated: Nov 17, 2026');
    expect(view.metaHtml).toBe('Nov 17, 2026');
    expect(view.contentHtml).toContain('deprecated and will be removed on Sep 15, 2027');
  });

  it('builds a tip from its summary', () => {
    const view = buildPage(
      'tips/get-notified',
      {
        title: 'Get notified',
        summary: 'Subscribe to feeds',
        updated_at: '2026-11-17T00:00:00Z',
        content_html: '<p>x</p>',
      },
      null,
    );
    expect(view.description).toBe('Subscribe to feeds');
    expect(view.contentHtml).not.toContain('deprecated');
  });
});
