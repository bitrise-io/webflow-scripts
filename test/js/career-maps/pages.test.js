import { describe, it, expect } from 'vitest';
import {
  compactCareerMaps,
  listPages,
  pageIndex,
  prepareCareerMaps,
  resolvePage,
} from '../../../src/js/career-maps/pages';
import { createCareerMaps } from './fixtures';

const departments = () => prepareCareerMaps(compactCareerMaps(createCareerMaps()));

describe('compactCareerMaps', () => {
  it('drops the Confluence links and the parser warnings, and keeps everything else', () => {
    const json = JSON.stringify(compactCareerMaps(createCareerMaps()));
    expect(json).not.toContain('atlassian.net/wiki/spaces');
    expect(json).not.toContain('Tenure is missing!');
    expect(json).toContain('Monthly in Hungary.');
    expect(json).toContain('"midPoint":776667');
  });

  it('does not change its input', () => {
    const data = createCareerMaps();
    compactCareerMaps(data);
    expect(data[0].teams[0].link).toBeDefined();
    expect(data[0].teams[0].jobs['Controlling Specialist'].P2.warnings).toEqual(['Tenure is missing!']);
  });
});

describe('prepareCareerMaps', () => {
  it('puts the departments in the order of the overview, and adds the team slugs', () => {
    const prepared = departments();
    expect(prepared.map((department) => department.name)).toEqual([
      'Research and Development',
      'General and Administrative',
    ]);
    expect(prepared[0].teams[0].slug).toBe('engineering');
  });
});

describe('listPages and pageIndex', () => {
  it('lists every level, in the order of the site', () => {
    expect(listPages(departments()).map((page) => page.path)).toEqual([
      'engineering/software-engineer/p2',
      'engineering/software-engineer/p3',
      'engineering/engineering-manager/m3',
      'finance/controlling-specialist/p2',
    ]);
  });

  it('leads team and job paths to their first level', () => {
    expect(pageIndex(departments()).redirects).toEqual({
      engineering: 'engineering/software-engineer/p2',
      'engineering/software-engineer': 'engineering/software-engineer/p2',
      'engineering/engineering-manager': 'engineering/engineering-manager/m3',
      finance: 'finance/controlling-specialist/p2',
      'finance/controlling-specialist': 'finance/controlling-specialist/p2',
    });
  });
});

describe('resolvePage', () => {
  it('finds a level page', () => {
    const page = resolvePage(departments(), 'engineering/software-engineer/p3');
    expect(page.path).toBe('engineering/software-engineer/p3');
    expect(page.level.name).toBe('Software Engineer (P3)');
    expect(page.job.levels.map((level) => level.slug)).toEqual(['p2', 'p3']);
  });

  it('takes the first job and level when they are left out', () => {
    expect(resolvePage(departments(), 'engineering').path).toBe('engineering/software-engineer/p2');
    expect(resolvePage(departments(), 'engineering/engineering-manager/').path).toBe(
      'engineering/engineering-manager/m3',
    );
  });

  it('finds nothing for unknown teams, jobs and levels, and for teams without jobs', () => {
    ['team', 'nope', 'engineering/nope', 'engineering/software-engineer/p9', 'legal', 'engineering/a/b/c'].forEach(
      (path) => expect(resolvePage(departments(), path)).toBeNull(),
    );
  });
});
