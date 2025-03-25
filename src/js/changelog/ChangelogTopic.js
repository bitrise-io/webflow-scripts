/** @typedef {("new-feature" | "feature-update" | "step-update" | "deprecation")} ChangelogTag */

/**
 * @typedef {{
 *  id: number,
 *  title: string,
 *  fancy_title: string,
 *  slug: string,
 *  created_at: string,
 *  pinned: boolean,
 *  tags: string[],
 *  post_stream?: {
 *    posts: DiscoursePost[]
 *  }
 *  changelog?: RMAPIChangelog[]
 * }} DiscourseTopic
 */

/**
 * @typedef {{
 *  id: number,
 *  cooked: string
 * }} DiscoursePost
 */

/**
 * @typedef {{
 *  id: string,
 *  level: number,
 *  operation: string,
 *  operationId: string,
 *  path: string,
 *  section: string,
 *  source: string,
 *  text: string
 * }} RMAPIChangelog
 */

class ChangelogTopic {
  /** @param {DiscourseTopic} data */
  constructor(data) {
    /** @type {DiscourseTopic} */
    this.data = data;
  }

  /** @returns {number} */
  get id() {
    return this.data.id;
  }

  /** @returns {string} */
  get title() {
    return this.data.title;
  }

  /** @returns {string} */
  get fancyTitle() {
    return this.data.fancy_title.replace(
      /:([^\s]+):/gi,
      '<img src="https://emoji.discourse-cdn.com/twitter/$1.png?v=12" title="$1" alt="$1" class="emoji">',
    );
  }

  /** @returns {Date} */
  get createdAt() {
    return new Date(this.data.created_at);
  }

  /** @returns {string} */
  get slug() {
    return this.data.slug;
  }

  /** @returns {string} */
  get webflowUrl() {
    if (this.id === 0) {
      return `/changelog/${this.slug}`;
    }
    return `/changelog/${this.slug}/${this.id}`;
  }

  /** @returns {boolean} */
  get isPinned() {
    return !!this.data.pinned;
  }

  /** @returns {DiscoursePost[]} */
  get posts() {
    if (this.data.post_stream) {
      return this.data.post_stream.posts;
    }
    return [];
  }

  /** @returns {string} */
  get content() {
    if (this.data.slug.match(/rm-\d+/) && this.data.changelog) {
      return this.data.changelog
        .map(
          (changelog) => `
          <div class='rmcl'>
            <h3>${changelog.operationId}</h3>
            <div>
              <span class="rmcl-http-method-tag rmcl-http-method-${changelog.operation.toLocaleLowerCase()}">${changelog.operation}</span>
              <span class="rmcl-api-endpoint-url">${changelog.path}</span>
            </div>
            <p>${changelog.text.replaceAll(/'([^']+)'/g, '<span class="rmcl-inline-code">$1</span>')}</p>
          </div>
      `,
        )
        .join('');
    }
    return this.posts.length ? this.posts[0].cooked : '';
  }

  /** @returns {ChangelogTag[]} */
  get tags() {
    return (this.data.tags || []).filter((tag) =>
      ['new-feature', 'feature-update', 'step-update', 'deprecation', 'api-update'].includes(tag),
    );
  }
}

export default ChangelogTopic;
