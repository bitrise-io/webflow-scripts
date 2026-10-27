import { describe, expect, it } from 'vitest';
import { formatDate, parseDateOnly } from '../../../src/js/shared/common';

describe('parseDateOnly', () => {
  it('parses date-only values as local dates', () => {
    expect(formatDate(parseDateOnly('2027-04-08'))).toBe('Apr 8, 2027');
  });

  it('parses timestamps as usual', () => {
    expect(parseDateOnly('2026-06-03T07:47:35-05:00').getTime()).toBe(new Date('2026-06-03T12:47:35Z').getTime());
  });
});
