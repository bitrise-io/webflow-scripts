import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { prepareCareerMaps, resolvePage } from '../../../src/js/career-maps/pages';
import {
  applyPageMeta,
  bindSidebarToggle,
  isCareerMapsRendered,
  levelPageMeta,
  markCareerMapsRendered,
  renderOverview,
  renderTeamPage,
} from '../../../src/js/career-maps/render';
import { createCareerMaps, OVERVIEW_HTML, TEAM_HTML } from './fixtures';

const departments = prepareCareerMaps(createCareerMaps());

const renderLevel = (path) => {
  const page = resolvePage(departments, path);
  const dom = new JSDOM(TEAM_HTML, { url: `https://bitrise.io/careers/maps/${page.path}` });
  renderTeamPage(dom.window.document, page);
  return { doc: dom.window.document, page };
};

describe('renderOverview', () => {
  const dom = new JSDOM(OVERVIEW_HTML, { url: 'https://bitrise.io/careers/maps' });
  const doc = dom.window.document;
  renderOverview(doc, departments);

  it('renders a section per department, in order', () => {
    expect([...doc.querySelectorAll('[data-template-id="cm-department-name"]')].map((e) => e.textContent)).toEqual([
      'Research and Development',
      'General and Administrative',
    ]);
  });

  it('renders a card for teams with jobs only, linking straight to level pages', () => {
    const cards = [...doc.querySelectorAll('[data-template-id="cm-team"]')];
    expect(cards.map((card) => card.querySelector('[data-template-id="cm-team-name"]').textContent)).toEqual([
      'Engineering',
      'Finance',
    ]);
    expect(cards[0].querySelector('[data-template-id="cm-team-link"]').getAttribute('href')).toBe(
      '/careers/maps/engineering/software-engineer/p2',
    );
    expect([...cards[0].querySelectorAll('.text-link')].map((a) => a.getAttribute('href'))).toEqual([
      '/careers/maps/engineering/software-engineer/p2',
      '/careers/maps/engineering/engineering-manager/m3',
    ]);
  });
});

describe('renderTeamPage', () => {
  it('fills the title, the level heading and the loading state', () => {
    const { doc } = renderLevel('engineering/software-engineer/p2');
    expect(doc.querySelector('#cm-team-page-title').textContent).toBe('Software Engineer career map');
    expect(doc.querySelector('#cm-level-heading').textContent).toBe('Software Engineer (P2)');
    expect(doc.querySelector('.cm-loading')).toBeNull();
    expect(doc.querySelector('.cm-loaded')).not.toBeNull();
  });

  it('lists the salaries of the primary hiring locations', () => {
    const { doc } = renderLevel('engineering/software-engineer/p2');
    const rows = [...doc.querySelectorAll('#cm-compensation-table tbody tr')].map((row) =>
      [...row.querySelectorAll('td')].map((td) => td.textContent),
    );
    expect(rows).toEqual([
      ['Hungary (HUF)', '900,000', '1,300,000'],
      ['US (USD)', '120,000', '180,000'],
    ]);
    expect(doc.querySelector('#cm-bonus-title').textContent).toBe('Bonus percentage');
    expect(doc.querySelector('#cm-bonus-value').textContent).toBe('10%');
  });

  it('shows the variable pay when there is no bonus, and hides an empty tenure', () => {
    const { doc } = renderLevel('engineering/software-engineer/p3');
    expect(doc.querySelector('#cm-bonus-title').textContent).toBe('Variable pay percentage');
    expect(doc.querySelector('#cm-tenure-section').style.display).toBe('none');
  });

  it('reshapes the description: headings, Confluence links, tables', () => {
    const { doc } = renderLevel('engineering/software-engineer/p2');
    const description = doc.querySelector('#cm-way-of-working-description');
    expect(description.querySelector('h5').textContent).toBe('Scope');
    expect(description.querySelector('a[href*="atlassian"]')).toBeNull();
    expect(description.textContent).toContain('the wiki');
    expect(description.querySelector('a[href="https://example.com/"]')).not.toBeNull();
    expect(description.querySelector('table').className).toBe('fs-table_table');
    const [full, empty] = description.querySelectorAll('tbody tr');
    expect(full.querySelectorAll('td')[1].className).toBe('fs-table_cell is-white');
    expect(empty.querySelectorAll('td')).toHaveLength(1);
    expect(empty.querySelector('td').colSpan).toBe(2);
  });

  it('lists the levels of the current job in the sidebar, the current one selected', () => {
    const { doc } = renderLevel('engineering/software-engineer/p3');
    const sections = [...doc.querySelectorAll('.cm-sidebar-list > div')];
    expect(sections.map((section) => section.style.display)).toEqual(['block', 'none']);
    const links = [...sections[0].querySelectorAll('a')];
    expect(links.map((a) => [a.getAttribute('href'), a.className])).toEqual([
      ['/careers/maps/engineering/software-engineer/p2', ''],
      ['/careers/maps/engineering/software-engineer/p3', 'cm-selected-level cm-level-name'],
    ]);
    expect(sections[1].querySelector('a').getAttribute('href')).toBe(
      '/careers/maps/engineering/engineering-manager/m3',
    );
  });
});

describe('page meta and the rendered flag', () => {
  it('writes the title, description and canonical URL of a level page into the head', () => {
    const { doc, page } = renderLevel('finance/controlling-specialist/p2');
    applyPageMeta(doc, levelPageMeta(page));
    expect(doc.title).toBe('P2 - Associate Controlling Specialist | Finance career map | Bitrise');
    expect(doc.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(
      'https://bitrise.io/careers/maps/finance/controlling-specialist/p2',
    );
    expect(doc.querySelector('meta[property="og:title"]').getAttribute('content')).toBe(doc.title);
    expect(doc.querySelector('meta[name="description"]').getAttribute('content')).toContain(
      'P2 - Associate Controlling Specialist level in the Finance team',
    );
  });

  it('marks a page as rendered, and the sidebar toggle still works on it', () => {
    const { doc } = renderLevel('engineering/software-engineer/p2');
    expect(isCareerMapsRendered(doc)).toBe(false);
    markCareerMapsRendered(doc);
    const rendered = new JSDOM(doc.documentElement.outerHTML).window.document;
    expect(isCareerMapsRendered(rendered)).toBe(true);

    bindSidebarToggle(rendered);
    rendered.querySelector('#cm-sidebar-toggle').click();
    expect(rendered.querySelector('.cm-sidebar-list').style.display).toBe('block');
    rendered.querySelector('#cm-sidebar-toggle').click();
    expect(rendered.querySelector('.cm-sidebar-list').style.display).toBe('none');
  });
});
