import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchChangelogCategoryIds } from '../../../src/js/changelog/discourse';

const ctx = { waitUntil: vi.fn() };
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
vi.stubGlobal('caches', { default: { match: async () => undefined, put: async () => {} } });

beforeEach(() => mockFetch.mockReset());

describe('fetchChangelogCategoryIds', () => {
  it('allows the changelog category and its public subcategories', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          category_list: {
            categories: [
              { id: 48, parent_category_id: 6, read_restricted: false },
              { id: 74, parent_category_id: 6, read_restricted: false },
              { id: 90, parent_category_id: 6, read_restricted: true },
              { id: 12, parent_category_id: 3, read_restricted: false },
            ],
          },
        }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const ids = await fetchChangelogCategoryIds({}, ctx);
    expect([...ids].sort((a, b) => a - b)).toEqual([6, 48, 74]);
    expect(String(mockFetch.mock.calls[0][0])).toBe('https://discuss.bitrise.io/categories.json?parent_category_id=6');
  });

  it('falls back to the changelog category alone when the list cannot be loaded', async () => {
    mockFetch.mockResolvedValue(new Response('down', { status: 503 }));
    expect([...(await fetchChangelogCategoryIds({}, ctx))]).toEqual([6]);
  });
});
