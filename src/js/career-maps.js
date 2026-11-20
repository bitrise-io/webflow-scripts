import { fancyConsoleLog } from './shared/common';
import { prepareCareerMaps, resolvePage } from './career-maps/pages';
import { bindSidebarToggle, isCareerMapsRendered, renderOverview, renderTeamPage } from './career-maps/render';

import '../css/career-maps.css';

fancyConsoleLog('Bitrise.io Career Maps');

/**
 * @typedef {{
 *  name: string,
 *  description?: string,
 *  priority?: number,
 *  teams: Team[]
 * }} Department
 */

/**
 * @typedef {{
 *  name: string,
 *  slug: string,
 *  message?: string,
 *  jobs: Record<string, Record<string, Level>>
 * }} Team
 */

/**
 * @typedef {{
 *  name: string,
 *  slug: string,
 *  levels: Level[]
 * }} Job
 */

/**
 * @typedef {{
 *  name: string,
 *  slug: string,
 *  salary: Record<string, SalaryRange>,
 *  salaryNotes?: string,
 *  bonus?: string,
 *  bonusNotes?: string,
 *  variablePay?: string,
 *  commission?: string,
 *  tenure: string,
 *  description: string,
 * }} Level
 */

/**
 * @typedef {{
 *  lowEnd: number,
 *  highEnd: number,
 * }} SalaryRange
 */

/** @type {(() => void)[]} */
const resetDocument = [];

const OVERVIEW_PATH = /^\/careers\/maps\/?$/;
const TEAM_PAGE_PATH = /^\/careers\/maps\/([a-z0-9-/]+)$/;

(async () => {
  const { pathname } = document.location;

  // Pages rendered by the SSR job already have their content; only the event handlers are missing.
  if (isCareerMapsRendered(document)) {
    bindSidebarToggle(document);
    return;
  }

  const response = await fetch('/careers/maps/data.json');
  const careerMaps = prepareCareerMaps(await response.json());

  if (pathname.match(OVERVIEW_PATH)) {
    resetDocument.push(renderOverview(document, careerMaps));
    return;
  }

  const teamPageMatch = pathname.match(TEAM_PAGE_PATH);
  const page = teamPageMatch && resolvePage(careerMaps, teamPageMatch[1]);
  if (page) {
    if (pathname !== `/careers/maps/${page.path}`) {
      window.history.replaceState({}, '', `/careers/maps/${page.path}`);
    }
    resetDocument.push(renderTeamPage(document, page));
    bindSidebarToggle(document);
  }
})();

if (import.meta.webpackHot) {
  import.meta.webpackHot.dispose(() => {
    while (resetDocument.length) {
      resetDocument.pop()();
    }
  });
  import.meta.webpackHot.accept();
}
