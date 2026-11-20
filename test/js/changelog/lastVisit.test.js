import { describe, it, expect } from 'vitest';
import { resolveLastVisit } from '../../../src/js/changelog/lastVisit';

const now = new Date('2026-11-20T10:00:00Z');

describe('resolveLastVisit', () => {
  it('treats nothing as unread without a cookie', () => {
    const { lastVisitDate, newLastVisitDate } = resolveLastVisit({ now });
    expect(lastVisitDate.getTime()).toBe(now.getTime());
    expect(newLastVisitDate.getTime()).toBe(now.getTime());
  });

  it('reads the previous visit from the cookie and stores now for the next one', () => {
    const cookie = `a=b; changelogLastVisit=${encodeURIComponent('Mon Nov 16 2026 10:00:00 GMT+0000 (UTC)')}; c=d`;
    const { lastVisitDate, newLastVisitDate } = resolveLastVisit({ cookieHeader: cookie, now });
    expect(lastVisitDate.toISOString()).toBe('2026-11-16T10:00:00.000Z');
    expect(newLastVisitDate.getTime()).toBe(now.getTime());
  });

  it('lets ?lastVisit=<days> override the cookie', () => {
    const { lastVisitDate } = resolveLastVisit({ cookieHeader: 'changelogLastVisit=x', overrideDays: '3', now });
    expect(lastVisitDate.toISOString()).toBe('2026-11-17T10:00:00.000Z');
  });

  it('ignores an override that is not a number', () => {
    const { lastVisitDate } = resolveLastVisit({ overrideDays: 'abc', now });
    expect(lastVisitDate.getTime()).toBe(now.getTime());
  });
});
