export const LAST_VISIT_COOKIE = 'changelogLastVisit';

/**
 * Works out which topics count as unread: the ones newer than the visitor's previous visit.
 * Used by the worker (cookie from the request) and by the browser script (document.cookie).
 * @param {{ cookieHeader?: string, overrideDays?: string | null, now?: Date }} options
 * @returns {{ lastVisitDate: Date, newLastVisitDate: Date }} the previous visit, and the value to store for the next one
 */
export const resolveLastVisit = ({ cookieHeader = '', overrideDays = null, now = new Date() } = {}) => {
  let lastVisitDate = new Date(now);
  const newLastVisitDate = new Date(now);

  const cookieMatch = cookieHeader.match(new RegExp(`${LAST_VISIT_COOKIE}=([^;]+);?`));
  if (cookieMatch) {
    lastVisitDate = new Date(decodeURIComponent(cookieMatch[1]));
  }

  // ?lastVisit=<days> pretends the previous visit was that many days ago (handy for testing)
  const days = parseInt(overrideDays, 10);
  if (!Number.isNaN(days)) {
    newLastVisitDate.setDate(newLastVisitDate.getDate() - days);
    lastVisitDate = new Date(newLastVisitDate);
  }

  return { lastVisitDate, newLastVisitDate };
};
