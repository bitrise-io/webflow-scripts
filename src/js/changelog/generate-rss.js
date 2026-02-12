const fs = require('fs');

/**
 * Convert kebab-case to Sentence case
 * @param {string} str
 * @returns {string}
 */
function kebabToSentenceCase(str) {
  if (typeof str !== 'string') throw new Error(`Expected a string but got ${typeof str}`);
  if (!str) return '';
  return str
    .split('-')
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Generate an RSS 2.0 feed from changelog topics
 * @param {string} changelogPath
 * @param {string} rssPath
 */
const generateChangelogRSS = async (changelogPath, rssPath) => {
  const changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
  const { topics } = changelog.topic_list;

  const now = new Date();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const recentTopics = topics.filter((t) => {
    const created = new Date(t.created_at);
    return now - created <= THIRTY_DAYS;
  });

  // Sort by date descending, cap at 50
  const sortedTopics = recentTopics.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);

  /**
   * Escape XML special characters
   * @param {string} str
   * @returns {string}
   */
  function escape(str) {
    if (typeof str !== 'string') {
      process.stderr.write(`Warning: Expected string but got ${typeof str}\n`);
      return '';
    }
    return (str || '').replace(/[&<>]/g, (c) => {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  const items = sortedTopics
    .map((topic) => {
      const categories = (Array.isArray(topic.tags) ? topic.tags : [])
        .map((tag) => `<category>${escape(kebabToSentenceCase(tag))}</category>`)
        .join('');
      return `    <item>
      <title>${escape(topic.title)}</title>
      <link>https://bitrise.io/changelog/${topic.slug}/${topic.id}</link>
      <guid>https://bitrise.io/changelog/${topic.slug}/${topic.id}</guid>
      <pubDate>${new Date(topic.created_at).toUTCString()}</pubDate>
      <description>Visit the link for full details and discussion.</description>
      ${categories}
    </item>`;
    })
    .join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Bitrise Changelog</title>
    <link>https://bitrise.io/changelog</link>
    <description>What's new on Bitrise</description>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>\n`;

  fs.writeFileSync(rssPath, rss, 'utf8');
  // RSS feed written to file
};

module.exports = { generateChangelogRSS };

if (require.main === module) {
  generateChangelogRSS(process.argv[2], process.argv[3]);
}

// <link rel="alternate" type="application/rss+xml" title="Bitrise Changelog" href="https://bitrise.io/changelog.xml?v1" />
