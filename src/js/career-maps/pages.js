import { createSlug } from './tools';

/**
 * Data helpers shared by the browser script and the SSR job. No DOM here.
 */

const DEPARTMENT_ORDER = {
  'Research and Development': 1,
  'Go To Market': 2,
  'General and Administrative': 3,
};

/**
 * The data without the fields the pages do not use: the Confluence page links and the editorial warnings of the
 * parser. This is what the site publishes.
 * @param {import('../career-maps').Department[]} departments
 * @returns {import('../career-maps').Department[]}
 */
export const compactCareerMaps = (departments) =>
  departments.map((department) => ({
    ...department,
    teams: department.teams.map(({ link, ...team }) => ({
      ...team,
      ...(team.jobs && {
        jobs: Object.fromEntries(
          Object.entries(team.jobs).map(([jobName, levels]) => [
            jobName,
            Object.fromEntries(
              // eslint-disable-next-line no-unused-vars
              Object.entries(levels).map(([levelKey, { link: levelLink, warnings, ...level }]) => [levelKey, level]),
            ),
          ]),
        ),
      }),
    })),
  }));

/**
 * Adds the team slugs, and puts the departments in the order of the overview page.
 * @param {import('../career-maps').Department[]} departments
 * @returns {import('../career-maps').Department[]}
 */
export const prepareCareerMaps = (departments) =>
  departments
    .map((department) => {
      const name = department.name === 'General & Administrative' ? 'General and Administrative' : department.name;
      return {
        ...department,
        name,
        priority: DEPARTMENT_ORDER[name],
        teams: department.teams.map((team) => ({ ...team, slug: createSlug(team.name) })),
      };
    })
    .sort((a, b) => {
      if (a.priority && b.priority) return a.priority - b.priority;
      return a.name.localeCompare(b.name);
    });

/**
 * @typedef {{
 *  team: import('../career-maps').Team,
 *  job: import('../career-maps').Job,
 *  level: import('../career-maps').Level,
 *  path: string,
 * }} CareerMapPage
 */

/**
 * @param {import('../career-maps').Team} team
 * @param {string} jobName
 * @returns {import('../career-maps').Job}
 */
const toJob = (team, jobName) => ({
  name: jobName,
  slug: createSlug(jobName),
  levels: Object.keys(team.jobs[jobName]).map((levelShortName) => ({
    ...team.jobs[jobName][levelShortName],
    slug: createSlug(levelShortName),
  })),
});

/**
 * All level pages, in the order of the site: team, then job, then level.
 * @param {import('../career-maps').Department[]} departments - prepared with prepareCareerMaps
 * @returns {CareerMapPage[]}
 */
export const listPages = (departments) =>
  departments.flatMap((department) =>
    department.teams.flatMap((team) =>
      Object.keys(team.jobs || {}).flatMap((jobName) => {
        const job = toJob(team, jobName);
        return job.levels.map((level) => ({ team, job, level, path: `${team.slug}/${job.slug}/${level.slug}` }));
      }),
    ),
  );

/**
 * The page index the worker reads: the paths of all level pages, and where the shorter team and job paths lead
 * (the first job of the team, the first level of the job).
 * @param {import('../career-maps').Department[]} departments - prepared with prepareCareerMaps
 * @returns {{ pages: string[], redirects: Record<string, string> }}
 */
export const pageIndex = (departments) => {
  const pages = listPages(departments).map((page) => page.path);
  const redirects = {};
  pages.forEach((path) => {
    const [team, job] = path.split('/');
    if (!redirects[team]) redirects[team] = path;
    if (!redirects[`${team}/${job}`]) redirects[`${team}/${job}`] = path;
  });
  return { pages, redirects };
};

/**
 * The level page of a path like "engineering/software-engineer/p3". The job and the level may be left out: the
 * first job of the team and the first level of the job are taken then. Null for anything that is not a page.
 * @param {import('../career-maps').Department[]} departments - prepared with prepareCareerMaps
 * @param {string} path
 * @returns {CareerMapPage | null}
 */
export const resolvePage = (departments, path) => {
  const [teamSlug, jobSlug, levelSlug, ...rest] = path.replace(/^\/+|\/+$/g, '').split('/');
  if (rest.length) return null;

  const team = departments.flatMap((department) => department.teams).find((t) => t.slug === teamSlug);
  if (!team || !team.jobs || !Object.keys(team.jobs).length) return null;

  const jobName = jobSlug
    ? Object.keys(team.jobs).find((name) => createSlug(name) === jobSlug)
    : Object.keys(team.jobs)[0];
  if (!jobName) return null;
  const job = toJob(team, jobName);

  const level = levelSlug ? job.levels.find((l) => l.slug === levelSlug) : job.levels[0];
  if (!level) return null;

  return { team, job, level, path: `${team.slug}/${job.slug}/${level.slug}` };
};
