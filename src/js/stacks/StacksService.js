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

const deprecations = [
  {
    edgeOrStable: 'edge',
    versionPattern: /xcode-16.*/,
    message: 'This edge stack is deprecated and will be removed on June 18th.',
  },
];

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
          const ubuntuMatch = link.path.match(/changelogs\/(linux[^/]+)/);
          if (ubuntuMatch) {
            const version = ubuntuMatch[1];
            if (!stacksLinks.ubuntu[version]) stacksLinks.ubuntu[version] = {};
            stacksLinks.ubuntu[version].title = link.title.replace(/ changelogs?/, '').trim();
            stacksLinks.ubuntu[version].changelogs = [link.path, 'Changelog', link.updated_at];
          }
          const xcodeMatch = link.path.match(/changelogs\/([^/]+xcode[^/]+)/);
          if (xcodeMatch) {
            const edgeOrStable = xcodeMatch[1].match(/-edge/) ? 'edge' : 'stable';
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
          const awsMatch = link.path.match(/stack_reports\/aws\/([^/]+)/);
          if (awsMatch) {
            const version = awsMatch[1];
            if (!stacksLinks.aws[version]) stacksLinks.aws[version] = {};
            stacksLinks.aws[version].title = link.title.replace(/ stack reports?/, '').trim();
            stacksLinks.aws[version].stack_reports = [link.path, 'Report', link.updated_at];
          }
          const ubuntuMatch = link.path.match(/stack_reports\/(linux[^/]+)/);
          if (ubuntuMatch) {
            const version = ubuntuMatch[1];
            if (!stacksLinks.ubuntu[version]) stacksLinks.ubuntu[version] = {};
            stacksLinks.ubuntu[version].title = link.title.replace(/ stack reports?/, '').trim();
            stacksLinks.ubuntu[version].stack_reports = [link.path, 'Report', link.updated_at];
          }
          const xcodeMatch = link.path.match(/stack_reports\/([^/]+xcode[^/]+)/);
          if (xcodeMatch) {
            const edgeOrStable = xcodeMatch[1].match(/-edge/) ? 'edge' : 'stable';
            const version = xcodeMatch[1].replace(/-edge/, '');
            if (!stacksLinks.xcode[version]) stacksLinks.xcode[version] = {};
            if (!stacksLinks.xcode[version][edgeOrStable]) stacksLinks.xcode[version][edgeOrStable] = {};
            stacksLinks.xcode[version].title = link.title.replace(/( with edge updates| stack reports?)/g, '').trim();
            stacksLinks.xcode[version][edgeOrStable].stack_reports = [link.path, 'Report', link.updated_at];
          }
        });
      }
    });

    Object.keys(stacksLinks.xcode).forEach((version) => {
      deprecations.forEach(({ versionPattern, message, edgeOrStable }) => {
        if (versionPattern.test(version)) {
          if (stacksLinks.xcode[version][edgeOrStable]) {
            stacksLinks.xcode[version][edgeOrStable].deprecated = message; // Mark deprecated stacks
          }
        }
      });
    });

    return stacksLinks;
  }

  /**
   * Fetches the stacks index page and parses it to extract stacks links.
   * @returns {Promise<StacksLinks>} - A promise that resolves to an object containing the stacks links.
   */
  async fetchStacksIndexPage() {
    const response = await fetch(`${this.stacksAPIBase}index.html`);
    const html = await response.text();
    return this.parseStacksIndexPage(html);
  }

  /**
   * Parses the stacks index page HTML and extracts the stacks links.
   * @param {string} html - The HTML content of the stacks index page.
   * @returns {StacksLinks} - An object containing the stacks links.
   */
  parseStacksIndexPage(html) {
    const match = html.match(/<main.*\/main>/gms);

    const dataContainerId = 'stacks-data-container';
    let dataContainer = document.getElementById(dataContainerId);
    if (!dataContainer) {
      dataContainer = document.createElement('div');
      dataContainer.style.display = 'none';
      dataContainer.id = dataContainerId;
      document.querySelector('body').append(dataContainer);
    }
    [dataContainer.innerHTML] = match;

    const stacksLinks = {
      announcements: {},
      xcode: {},
      ubuntu: {},
      aws: {},
      tools: {},
      tips: {},
    };

    [...dataContainer.querySelectorAll('a')]
      .map((link) => {
        return [new URL(link.href).pathname.replace(/\/$/, ''), link.innerHTML];
      })
      .forEach(([pathname, title]) => {
        const announcementsMatch = pathname.match(/announcements\/([^/]+)/);
        if (announcementsMatch) {
          stacksLinks.announcements[announcementsMatch[1]] = [pathname, title, null];
        }
        const toolsMatch = pathname.match(/tools\/([^/]+)/);
        if (toolsMatch) {
          stacksLinks.tools[toolsMatch[1]] = [pathname, title, null];
        }
        const tipsMatch = pathname.match(/tips\/([^/]+)/);
        if (tipsMatch) {
          stacksLinks.tips[tipsMatch[1]] = [pathname, title, null];
        }
        const awsMatch = pathname.match(/(stack_reports|changelogs)\/aws\/([^/]+)/);
        if (awsMatch) {
          const version = awsMatch[2];
          if (!stacksLinks.aws[version]) stacksLinks.aws[version] = {};
          stacksLinks.aws[version].title = title.replace(/ changelogs?/, '').trim();
          if (awsMatch[1] === 'changelogs') {
            stacksLinks.aws[version].changelogs = [pathname, 'Changelog', null];
          }
          if (awsMatch[1] === 'stack_reports') {
            stacksLinks.aws[version].stack_reports = [pathname, 'Report', null];
          }
        }
        const xcodeMatch = pathname.match(/(stack_reports|changelogs)\/([^/]+xcode[^/]+)/);
        if (xcodeMatch) {
          const edge = xcodeMatch[2].match(/-edge/) ? 'edge' : 'stable';
          const version = xcodeMatch[2].replace(/-edge/, '');
          if (!stacksLinks.xcode[version]) stacksLinks.xcode[version] = {};
          if (!stacksLinks.xcode[version][edge]) stacksLinks.xcode[version][edge] = {};
          stacksLinks.xcode[version].title = title.replace(/ with edge updates| changelogs?/, '').trim();
          if (xcodeMatch[1] === 'changelogs') {
            stacksLinks.xcode[version][edge].changelogs = [pathname, 'Changelog', null];
          }
          if (xcodeMatch[1] === 'stack_reports') {
            stacksLinks.xcode[version][edge].stack_reports = [pathname, 'Report', null];
          }
        }
        const ubuntuMatch = pathname.match(/(stack_reports|changelogs)\/(linux[^/]+)/);
        if (ubuntuMatch) {
          const version = ubuntuMatch[2];
          if (!stacksLinks.ubuntu[version]) stacksLinks.ubuntu[version] = {};
          stacksLinks.ubuntu[version].title = title.replace(/ changelogs?/, '').trim();
          if (ubuntuMatch[1] === 'changelogs') {
            stacksLinks.ubuntu[version].changelogs = [pathname, 'Changelog', null];
          }
          if (ubuntuMatch[1] === 'stack_reports') {
            stacksLinks.ubuntu[version].stack_reports = [pathname, 'Report', null];
          }
        }
      });

    dataContainer.remove();

    return stacksLinks;
  }
}

export default StacksService;
