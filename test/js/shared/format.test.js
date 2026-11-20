import { describe, it, expect } from 'vitest';
import { decodeEntities, escapeHtml, formatIsoDate, summarizeHtml } from '../../../src/js/shared/format';

describe('formatIsoDate', () => {
  it('uses the published calendar date', () => {
    expect(formatIsoDate('2026-11-17T17:16:53-06:00')).toBe('Nov 17, 2026');
    expect(formatIsoDate('2026-11-12 09:28:05')).toBe('Nov 12, 2026');
    expect(formatIsoDate('2026-09-28T00:00:00Z')).toBe('Sep 28, 2026');
  });
  it('returns an empty string for garbage', () => {
    expect(formatIsoDate('soon')).toBe('');
  });
});

describe('escapeHtml / decodeEntities', () => {
  it('escapes attribute-breaking characters', () => {
    expect(escapeHtml('a "b" <c> & d')).toBe('a &quot;b&quot; &lt;c&gt; &amp; d');
  });
  it('decodes named and numeric entities', () => {
    expect(decodeEntities('Tom &amp; Jerry &#39;s &#x2014; &hellip; &unknown;')).toBe("Tom & Jerry 's — … &unknown;");
  });
});

describe('summarizeHtml', () => {
  it('returns the plain text of short html', () => {
    expect(summarizeHtml('<p>Hello <strong>world</strong></p>\n<p>again &amp; again</p>')).toBe(
      'Hello world again & again',
    );
  });
  it('drops svg, script and style content', () => {
    expect(summarizeHtml('<svg><title>x</title></svg><p>text</p><style>p{}</style>')).toBe('text');
  });
  it('cuts long text at a word boundary with an ellipsis', () => {
    const summary = summarizeHtml(`<p>${'word '.repeat(100)}</p>`, 50);
    expect(summary.length).toBeLessThanOrEqual(50);
    expect(summary.endsWith('…')).toBe(true);
    expect(summary).not.toMatch(/wor…$/);
  });
});
