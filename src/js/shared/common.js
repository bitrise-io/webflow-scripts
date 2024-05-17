/**
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * @param {string} str1
 * @param {string} str2
 * @returns {boolean}
 */
function icaseEqual(str1, str2) {
  return str1.search(new RegExp(`^${str2}$`, 'i')) > -1;
}

/**
 * @param {string} str1
 * @param {string} str2
 * @returns {boolean}
 */
function icaseIncludes(str1, str2) {
  return str1.search(new RegExp(str2, 'i')) > -1;
}

/**
 * Returns the pure text contents within a HTMLElement.
 * @param {HTMLElement} element
 * @returns {string}
 */
function getElementTextContent(element) {
  return element.innerHTML.replace(/<[^>]+>/g, '').replace(/(^\s+|\s+$)/g, '');
}

/**
 * @param {Element} parent
 * @param {string} className
 * @returns {Element}
 */
function getFirstElementByClassname(parent, className) {
  const element = parent.getElementsByClassName(className)[0];
  if (!element) {
    throw new Error(`No element with class ${className} in DOM.`);
  }

  return element;
}

/**
 * @param {{name: string, property: string}} options
 * @returns {HTMLMetaElement}
 */
function getMetaTag(options) {
  const key = 'property' in options ? 'property' : 'name';

  /** @type {?HTMLMetaElement} */
  let metaTag = document.querySelector(`meta[${key}="${options[key]}"]`);
  if (!metaTag) {
    metaTag = document.createElement('meta');
    metaTag.setAttribute(key, options[key]);
    document.querySelector('head').appendChild(metaTag);
  }
  return metaTag;
}

/**
 * @param {{name: string, property: string}} options
 * @param {string} content
 */
function setMetaContent(options, content) {
  getMetaTag(options).content = content;
}

/**
 * @param {string} text
 */
function fancyConsoleLog(text) {
  const tpl =
    'border-radius: 4px;' +
    'background-image: linear-gradient(318deg, #0dd3c5, #652ec3 48%, #760fc3 84%, #990fc3); ' +
    'font-size:16px; font-weight: 100;padding:3px 5px;color:';
  // eslint-disable-next-line no-console
  console.log(`%c${text}`, `${tpl}white`);
}

/**
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const [, month, day, year] = date.toDateString().split(' ');
  return `${month} ${day.replace(/^0/, '')}, ${year}`;
}

export {
  capitalize,
  fancyConsoleLog,
  formatDate,
  getElementTextContent,
  getFirstElementByClassname,
  getMetaTag,
  icaseEqual,
  icaseIncludes,
  setMetaContent,
};
