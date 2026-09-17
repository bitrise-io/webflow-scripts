import { describe, it, expect } from 'vitest';
import { rewriteDocsLinks } from '../../../src/js/integrations/docsRedirects';

describe('rewriteDocsLinks', () => {
  it('rewrites a known devcenter link to its docs replacement', () => {
    const html = '<a href="https://devcenter.bitrise.io/en/connectivity/configuring-ssh-keys">SSH keys</a>';

    expect(rewriteDocsLinks(html)).toBe(
      '<a href="https://docs.bitrise.io/en/bitrise-platform/repository-access/configuring-ssh-keys">SSH keys</a>',
    );
  });

  it('rewrites multiple occurrences in the same string', () => {
    const url = 'https://devcenter.bitrise.io/en/connectivity/configuring-ssh-keys';
    const html = `<a href="${url}">one</a><a href="${url}">two</a>`;

    const result = rewriteDocsLinks(html);
    expect(result).not.toContain('devcenter.bitrise.io');
    expect(result.match(/docs\.bitrise\.io/g)).toHaveLength(2);
  });

  it('does not touch links that have no mapping', () => {
    const html = '<a href="https://devcenter.bitrise.io/not/a/real/page/">unmapped</a>';
    expect(rewriteDocsLinks(html)).toBe(html);
  });

  it('leaves unrelated content untouched', () => {
    expect(rewriteDocsLinks('<p>No links here</p>')).toBe('<p>No links here</p>');
  });

  it('returns falsy input as-is', () => {
    expect(rewriteDocsLinks('')).toBe('');
    expect(rewriteDocsLinks(null)).toBe(null);
  });

  it('prefers the more specific (longer) URL when one is a prefix of another', () => {
    const base = 'https://devcenter.bitrise.io/builds/env-vars-secret-env-vars/';
    const anchored = `${base}#adding-a-secret-env-var`;

    expect(rewriteDocsLinks(anchored)).toBe(
      'https://docs.bitrise.io/en/bitrise-ci/configure-builds/environment-variables',
    );
  });
});
