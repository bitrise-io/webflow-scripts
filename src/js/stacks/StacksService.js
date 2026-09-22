import { formatDate } from '../shared/common';

/**
 * @typedef {{
 *  path: string;
 *  title: string;
 *  updated_at: string;
 *  archived: boolean;
 * }} StacksJsonLink
 * @typedef {{
 *  announcements: StacksJsonLink[];
 * }} StacksJsonAnnouncementsSection
 * @typedef {{
 *   tools: StacksJsonLink[];
 * }} StacksJsonToolsSection
 * @typedef {{
 *   tips: StacksJsonLink[];
 * }} StacksJsonTipsSection
 * @typedef {{
 *   changelogs: (StacksJsonLink & {
 *    changelog_meta: {
 *      stack_id: string;
 *    };
 *  })[];
 * }} StacksJsonChangelogsSection
 * @typedef {{
 *   stack_reports: (StacksJsonLink & {
 *    stack_meta: {
 *      cloud: "aws" | null;
 *      flavor: "stable" | "edge" | null;
 *      platform: "macOS" | "Linux";
 *      removal_date: string | null;
 *      stack_id: string;
 *      xcode: string | null;
 *    };
 *  })[];
 * }} StacksJsonStackReportsSection
 * @typedef {{
 *  updated_at: string;
 *  sections: (
 *  StacksJsonAnnouncementsSection |
 *  StacksJsonToolsSection |
 *  StacksJsonTipsSection |
 *  StacksJsonChangelogsSection |
 *  StacksJsonStackReportsSection
 *  )[];
 * }} StacksJson
 */

/**
 * @typedef {{
 *  stack_reports: [string, string, string];
 *  changelogs: [string, string, string];
 *  deprecated?: string;
 * }} StackLink
 * @typedef {{
 *  announcements: Record<string, [string, string, string]>;
 *  tools: Record<string, [string, string, string]>;
 *  tips: Record<string, [string, string, string]>;
 *  xcode: Record<string, {
 *    title: string;
 *    stable: StackLink;
 *    edge: StackLink
 *  }>;
 *  ubuntu: Record<string, StackLink & {
 *    title: string;
 *  }>;
 *  aws: Record<string, StackLink & {
 *   title: string;
 *  }>;
 * }} StacksLinks
 */

class StacksService {
  constructor() {
    this.stacksAPIBase = 'https://stacks.bitrise.io/';
  }

  /**
   * Fetches the stacks index JSON file and parses it to extract stacks links.
   * @returns {Promise<StacksLinks>} - A promise that resolves to an object containing the stacks links.
   */
  async fetchStacksIndexJson() {
    const response = await fetch(`${this.stacksAPIBase}index.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stacks index JSON: ${response.statusText}`);
    }
    const json = await response.json();
    return this.parseStacksIndexJson(json);
  }

  /**
   * Parses the stacks index JSON and extracts stacks links.
   * @param {StacksJson} json - The JSON data to parse.
   * @returns {StacksLinks} - An object containing the stacks links.
   */
  parseStacksIndexJson(json) {
    const stacksLinks = {
      announcements: {},
      xcode: {},
      ubuntu: {},
      aws: {},
      tools: {},
      tips: {},
    };

    json.sections.forEach((section) => {
      if (section.announcements) {
        /** @type {StacksJsonAnnouncementsSection} */
        const currentSection = section;
        currentSection.announcements.forEach((link) => {
          if (link.archived) return;
          stacksLinks.announcements[link.path] = [link.path, link.title, link.updated_at];
        });
      }
      if (section.tools) {
        /** @type {StacksJsonToolsSection} */
        const currentSection = section;
        currentSection.tools.forEach((link) => {
          if (link.archived) return;
          stacksLinks.tools[link.path] = [link.path, link.title, link.updated_at];
        });
      }
      if (section.tips) {
        /** @type {StacksJsonTipsSection} */
        const currentSection = section;
        currentSection.tips.forEach((link) => {
          if (link.archived) return;
          stacksLinks.tips[link.path] = [link.path, link.title, link.updated_at];
        });
      }
      if (section.changelogs) {
        /** @type {StacksJsonChangelogsSection} */
        const currentSection = section;
        currentSection.changelogs.forEach((link) => {
          if (link.archived) return;
          const awsMatch = link.path.match(/changelogs\/aws\/([^/]+)/);
          if (awsMatch) {
            const version = awsMatch[1];
            if (!stacksLinks.aws[version]) stacksLinks.aws[version] = {};
            stacksLinks.aws[version].title = link.title.replace(/ changelogs?/, '').trim();
            stacksLinks.aws[version].changelogs = [link.path, 'Changelog', link.updated_at];
          }
          const ubuntuMatch = link.path.match(/changelogs\/(linux[^/]+|ubuntu[^/]+)/);
          if (ubuntuMatch) {
            const version = ubuntuMatch[1];
            if (!stacksLinks.ubuntu[version]) stacksLinks.ubuntu[version] = {};
            stacksLinks.ubuntu[version].title = link.title.replace(/ changelogs?/, '').trim();
            stacksLinks.ubuntu[version].changelogs = [link.path, 'Changelog', link.updated_at];
          }
          const xcodeMatch = link.path.match(/changelogs\/(osx-[^/]+)/);
          if (xcodeMatch) {
            const edgeOrStable = xcodeMatch[1].match(/-edge|minimal/) ? 'edge' : 'stable';
            const version = xcodeMatch[1].replace(/-edge/, '');
            if (!stacksLinks.xcode[version]) stacksLinks.xcode[version] = {};
            if (!stacksLinks.xcode[version][edgeOrStable]) stacksLinks.xcode[version][edgeOrStable] = {};
            stacksLinks.xcode[version].title = link.title.replace(/( with edge updates| changelogs?)/g, '').trim();
            stacksLinks.xcode[version][edgeOrStable].changelogs = [link.path, 'Changelog', link.updated_at];
          }
        });
      }
      if (section.stack_reports) {
        /** @type {StacksJsonStackReportsSection} */
        const currentSection = section;
        currentSection.stack_reports.forEach((link) => {
          if (link.archived) return;
          const deprecated = link.stack_meta.removal_date ? formatDate(new Date(link.stack_meta.removal_date)) : null;
          const awsMatch = link.path.match(/stack_reports\/aws\/([^/]+)/);
          if (awsMatch) {
            const version = awsMatch[1];
            if (!stacksLinks.aws[version]) stacksLinks.aws[version] = {};
            stacksLinks.aws[version].title = link.title.replace(/ stack reports?/, '').trim();
            stacksLinks.aws[version].stack_reports = [link.path, 'Report', link.updated_at];
            stacksLinks.aws[version].deprecated = deprecated
              ? `This stack is deprecated and will be removed on ${deprecated}.`
              : null;
          }
          const ubuntuMatch = link.path.match(/stack_reports\/(linux[^/]+|ubuntu[^/]+)/);
          if (ubuntuMatch) {
            const version = ubuntuMatch[1];
            if (!stacksLinks.ubuntu[version]) stacksLinks.ubuntu[version] = {};
            stacksLinks.ubuntu[version].title = link.title.replace(/ stack reports?/, '').trim();
            stacksLinks.ubuntu[version].stack_reports = [link.path, 'Report', link.updated_at];
            stacksLinks.ubuntu[version].deprecated = deprecated
              ? `This stack is deprecated and will be removed on ${deprecated}.`
              : null;
          }
          const xcodeMatch = link.path.match(/stack_reports\/(osx-[^/]+)/);
          if (xcodeMatch) {
            const edgeOrStable = xcodeMatch[1].match(/-edge|minimal/) ? 'edge' : 'stable';
            const version = xcodeMatch[1].replace(/-edge/, '');
            if (!stacksLinks.xcode[version]) stacksLinks.xcode[version] = {};
            if (!stacksLinks.xcode[version][edgeOrStable]) stacksLinks.xcode[version][edgeOrStable] = {};
            stacksLinks.xcode[version].title = link.title.replace(/( with edge updates| stack reports?)/g, '').trim();
            stacksLinks.xcode[version][edgeOrStable].stack_reports = [link.path, 'Report', link.updated_at];
            stacksLinks.xcode[version][edgeOrStable].deprecated = deprecated
              ? `This stack is deprecated and will be removed on ${deprecated}.`
              : null;
          }
        });
      }
    });

    return stacksLinks;
  }
}

export default StacksService;
