import { createRequire } from 'module';
import { describe, it, expect } from 'vitest';

const { addPages } = createRequire(import.meta.url)('../../../src/js/sitemap/add-career-maps');

const SITEMAP = `<urlset>
  <url>
    <loc>https://bitrise.io/careers/maps</loc>
  </url>
  <url>
    <loc>https://bitrise.io/careers/maps/engineering/software-engineer/p2</loc>
  </url>
</urlset>`;

describe('addPages', () => {
  it('adds the pages that are not in the sitemap yet, and leaves the others alone', () => {
    const { sitemap, added } = addPages(SITEMAP, ['engineering/software-engineer/p2', 'people/payroll/p3']);
    expect(added).toBe(1);
    expect(sitemap).toContain('<loc>https://bitrise.io/careers/maps/people/payroll/p3</loc>');
    expect(sitemap.match(/software-engineer\/p2/g)).toHaveLength(1);
    expect(sitemap.endsWith('</urlset>')).toBe(true);
  });

  it('changes nothing when every page is there', () => {
    expect(addPages(SITEMAP, ['engineering/software-engineer/p2'])).toEqual({ sitemap: SITEMAP, added: 0 });
  });
});
