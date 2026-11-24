import { describe, it, expect } from 'vitest';
import { isListedInChangelog } from '../../../src/js/changelog/discourse';

const changelog = { topic_list: { topics: [{ id: 26571 }, { id: 26570 }] } };

describe('isListedInChangelog', () => {
  it('finds a topic that is in the generated changelog', () => {
    expect(isListedInChangelog({ id: 26571 }, changelog)).toBe(true);
  });

  it('does not find a topic that is not in it', () => {
    expect(isListedInChangelog({ id: 99 }, changelog)).toBe(false);
  });
});
