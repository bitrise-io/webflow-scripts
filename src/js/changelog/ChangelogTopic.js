/** @typedef {("new-feature" | "feature-update" | "step-update" | "deprecation")} ChangelogTag */

class ChangelogTopic
{
  constructor(data) {
    this.data = data;
  }

  /** @returns {number} */
  get id() {
    return this.data.id;
  }

  /** @returns {string} */
  get fancyTitle() {
    return this.data.fancy_title.replace(/:([^\s]+):/ig, '<img src="https://emoji.discourse-cdn.com/twitter/$1.png?v=12" title="$1" alt="$1" class="emoji">');
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
    return `/changelog/${this.slug}/${this.id}`;
  }

  /** @returns {boolean} */
  get isPinned() {
    return !!this.data.pinned;
  }

  get posts() {
    if (this.data.post_stream) {
      return this.data.post_stream.posts;
    }
    return [];
  }

  /** @returns {ChangelogTag[]} */
  get tags() {
    return this.data.tags || [];
  }
}

export default ChangelogTopic;