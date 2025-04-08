/**
 * @param {string} text
 * @returns {string}
 */
const createSlug = (text) => text.toLowerCase().replace(/ /g, '-');

export { createSlug };
