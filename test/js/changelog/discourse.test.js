import { describe, it, expect } from 'vitest';
import { isChangelogTopic } from '../../../src/js/changelog/discourse';

const changelog = { topic_list: { topics: [{ id: 26571 }, { id: 26570 }] } };

describe('isChangelogTopic', () => {
  it('accepts a topic of the changelog category without the changelog list', () => {
    expect(isChangelogTopic({ id: 1, category_id: 6 }, null)).toBe(true);
  });

  it('accepts a subcategory topic that is in the generated changelog', () => {
    expect(isChangelogTopic({ id: 26571, category_id: 74 }, changelog)).toBe(true);
  });

  it('rejects a topic of another category that is not in the changelog', () => {
    expect(isChangelogTopic({ id: 99, category_id: 12 }, changelog)).toBe(false);
  });

  it('rejects a subcategory topic when the changelog is unavailable', () => {
    expect(isChangelogTopic({ id: 26571, category_id: 74 }, null)).toBe(false);
  });
});
