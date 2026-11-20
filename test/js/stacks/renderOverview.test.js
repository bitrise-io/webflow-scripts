import { describe, it, expect } from 'vitest';
import StacksService from '../../../src/js/stacks/StacksService';
import {
  renderAnnouncements,
  renderAwsRows,
  renderOverview,
  renderStackLinks,
  renderTips,
  renderUbuntuRows,
  renderXcodeRows,
} from '../../../src/js/stacks/renderOverview';

const link = (path, title, updatedAt = '2026-11-17T17:16:53-06:00') => ({
  archived: false,
  path,
  title,
  updated_at: updatedAt,
});
const meta = (extra = {}) => ({ stack_meta: { removal_date: null, ...extra } });

const indexJson = {
  sections: [
    { announcements: [link('/announcements/a', 'About'), { ...link('/announcements/b', 'No date'), updated_at: '' }] },
    { tips: [link('/tips/t', 'A tip')] },
    {
      changelogs: [
        link('/changelogs/osx-xcode-26.0.x', 'Xcode 26.0 changelog'),
        link('/changelogs/osx-xcode-27.0.x-edge', 'Xcode 27.0 with edge updates changelog'),
        link('/changelogs/osx-xcode-27.0.x', 'Xcode 27.0 changelog'),
        link('/changelogs/osx-xcode-28.0.x-edge', 'Xcode 28.0 with edge updates changelog'),
        link('/changelogs/osx-xcode-minimal-edge', 'Xcode minimal with edge updates changelog'),
        link('/changelogs/ubuntu-noble', 'Ubuntu Noble changelog'),
        link('/changelogs/aws/aws-sonoma', 'AWS Sonoma changelog'),
      ],
    },
    {
      stack_reports: [
        { ...link('/stack_reports/osx-xcode-26.0.x', 'Xcode 26.0 stack report'), ...meta() },
        { ...link('/stack_reports/osx-xcode-27.0.x-edge', 'Xcode 27.0 with edge updates stack report'), ...meta() },
        {
          ...link('/stack_reports/osx-xcode-27.0.x', 'Xcode 27.0 stack report'),
          ...meta({ removal_date: '2027-09-15' }),
        },
        { ...link('/stack_reports/osx-xcode-28.0.x-edge', 'Xcode 28.0 with edge updates stack report'), ...meta() },
        { ...link('/stack_reports/osx-xcode-minimal-edge', 'Xcode minimal stack report'), ...meta() },
        { ...link('/stack_reports/ubuntu-noble', 'Ubuntu Noble stack report'), ...meta() },
        { ...link('/stack_reports/aws/aws-sonoma', 'AWS Sonoma stack report'), ...meta() },
      ],
    },
  ],
};

const links = new StacksService().parseStacksIndexJson(indexJson);

describe('renderStackLinks', () => {
  it('links both pages with their update date', () => {
    const html = renderStackLinks(
      ['/stack_reports/x', 'Report', '2026-11-17T17:16:53-06:00'],
      ['/changelogs/x', 'Changelog', null],
    );
    expect(html).toContain(
      'href="/stacks/stack_reports/x" class="stack-link-reports w-inline-block" title="Nov 17, 2026"',
    );
    expect(html).toContain(
      'href="/stacks/changelogs/x" class="stack-link-changelogs w-inline-block" style="visibility: visible"',
    );
    expect(html).not.toContain('hidden');
  });

  it('hides a missing link and the separator, and marks deprecated stacks', () => {
    const html = renderStackLinks(['/stack_reports/x', 'Report'], undefined, 'Deprecated!');
    expect(html).toContain('class="stack-link-changelogs w-inline-block" style="visibility: hidden"');
    expect(html).toContain('class="stack-links-separator" style="visibility: hidden"');
    expect(html).toContain('<span title="Deprecated!" class="deprecated-stack">⚠️</span>');
  });
});

describe('renderXcodeRows', () => {
  const html = renderXcodeRows(links.xcode);
  const rows = html.split('<div class="stack-row').slice(1);

  it('renders the newest version first', () => {
    expect(html.indexOf('Xcode 27.0')).toBeLessThan(html.indexOf('Xcode 26.0'));
  });

  it('renders stable-only rows without a mobile row', () => {
    const stableOnly = rows.find((row) => row.includes('>Xcode 26.0<'));
    expect(stableOnly.startsWith('"')).toBe(true);
    expect(rows.filter((row) => row.includes('>Xcode 26.0'))).toHaveLength(1);
  });

  it('renders stable and edge as a desktop row followed by a mobile row', () => {
    expect(html).toContain('stack-row stack-row-odd');
    expect(html).toContain('Xcode 27.0<br />with edge updates');
    expect(html).toContain('stack-row stack-row-mobile-only');
  });

  it('renders edge-only stacks with a placeholder for the stable column', () => {
    expect(html).toContain('stack-row stack-row-desktop-only');
    expect(html).toContain('Coming soon...');
    expect(html.match(/Coming soon/g)).toHaveLength(1); // the minimal stack gets a dash instead
    expect(html).toContain('(Edge version)');
  });

  it('shows the deprecation marker of the stack', () => {
    expect(html).toContain('removed on Sep 15, 2027');
  });
});

describe('other lists', () => {
  it('renders ubuntu and aws rows with the icon and links', () => {
    const ubuntu = renderUbuntuRows(links.ubuntu);
    expect(ubuntu).toContain('stack-version stack-version-double');
    expect(ubuntu).toContain('href="/stacks/stack_reports/ubuntu-noble"');
    expect(renderAwsRows(links.aws)).toContain('href="/stacks/changelogs/aws/aws-sonoma"');
  });

  it('renders announcements, leaving out missing dates', () => {
    const html = renderAnnouncements(links.announcements);
    expect(html).toContain(
      '<span class="changelog-title">About</span><span class="changelog-date">Nov 17, 2026</span>',
    );
    expect(html).toContain('<span class="changelog-title">No date</span></a>');
  });

  it('renders tips', () => {
    expect(renderTips(links.tips)).toContain('<a href="/stacks/tips/t" class="text-color-inherit">A tip</a>');
  });

  it('renders every list at once', () => {
    expect(Object.keys(renderOverview(links))).toEqual(['xcode', 'ubuntu', 'aws', 'announcements', 'tips']);
  });
});
