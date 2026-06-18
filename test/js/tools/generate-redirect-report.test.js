import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { generateHtmlReport } = require('../../../src/js/tools/generate-redirect-report');

const mockMeta = {
  inputFile: 'data/test-normalized.csv',
  baseUrl: 'https://bitrise.io',
  checkedAt: '2026-06-18T10:00:00.000Z',
  concurrency: 5,
  timeoutMs: 10000,
  totalChecked: 4,
};

const mockResults = [
  { source: '/foo', target: '/bar', resolvedUrl: 'https://bitrise.io/bar', status: 200, finalUrl: null, responseTime: 120, category: 'ok', error: null },
  { source: '/old', target: '/new', resolvedUrl: 'https://bitrise.io/new', status: 301, finalUrl: 'https://bitrise.io/final', responseTime: 80, category: 'redirecting', error: null },
  { source: '/dead', target: '/gone', resolvedUrl: 'https://bitrise.io/gone', status: 404, finalUrl: null, responseTime: 95, category: 'broken', error: null },
  { source: '/down', target: '/offline', resolvedUrl: 'https://bitrise.io/offline', status: null, finalUrl: null, responseTime: 10000, category: 'unreachable', error: 'Timeout after 10000ms' },
];

describe('generateHtmlReport', () => {
  it('generates valid HTML with doctype', () => {
    const html = generateHtmlReport(mockResults, mockMeta);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<table');
  });

  it('includes summary statistics', () => {
    const html = generateHtmlReport(mockResults, mockMeta);
    expect(html).toContain('>1<'); // ok count
    expect(html).toContain('>4<'); // total
  });

  it('includes all source paths in table rows', () => {
    const html = generateHtmlReport(mockResults, mockMeta);
    expect(html).toContain('/foo');
    expect(html).toContain('/old');
    expect(html).toContain('/dead');
    expect(html).toContain('/down');
  });

  it('shows final URL when redirect occurred', () => {
    const html = generateHtmlReport(mockResults, mockMeta);
    expect(html).toContain('https://bitrise.io/final');
  });

  it('includes input filename from meta', () => {
    const html = generateHtmlReport(mockResults, mockMeta);
    expect(html).toContain('data/test-normalized.csv');
  });

  it('includes checkedAt timestamp from meta', () => {
    const html = generateHtmlReport(mockResults, mockMeta);
    expect(html).toContain('2026-06-18 10:00:00 UTC');
  });

  it('escapes HTML special characters in source paths', () => {
    const xssResults = [{
      source: '/foo<script>alert(1)</script>', target: '/bar', resolvedUrl: 'https://bitrise.io/bar',
      status: 200, finalUrl: null, responseTime: 10, category: 'ok', error: null,
    }];
    const html = generateHtmlReport(xssResults, mockMeta);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('is a self-contained HTML file with no external resources', () => {
    const html = generateHtmlReport(mockResults, mockMeta);
    expect(html).toContain('<style>');
    expect(html).toContain('<script>');
    expect(html).not.toMatch(/rel=["']stylesheet["']/);
    expect(html).not.toMatch(/src=["']https?:\/\//);
  });

  it('embeds results as JSON for client-side filtering', () => {
    const html = generateHtmlReport(mockResults, mockMeta);
    expect(html).toContain('application/json');
    expect(html).toContain('"source":"/foo"');
  });
});
