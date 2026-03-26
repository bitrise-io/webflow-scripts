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

/**
 * @param {URL} url
 * @param {string} prefix
 * @param {string} fallbackQueryParam
 * @returns {?string}
 */
function detectTopicFromUrl(url, prefix, fallbackQueryParam) {
  const path = url.pathname;
  if (path.match(new RegExp(`${prefix}/?$`))) {
    return '';
  }
  const match = path.match(new RegExp(`${prefix}/(.+)$`));
  if (match && match[1] !== fallbackQueryParam) {
    return match[1];
  }
  if (fallbackQueryParam) {
    const fallback = url.searchParams.get(fallbackQueryParam);
    if (fallback) {
      return fallback;
    }
  }
  return null;
}

/**
 * Handles a 404 error by checking if a proxy is available and redirecting if necessary.
 * @param {URL} url - The URL that resulted in a 404 error.
 * @param {{
 *  pathPrefix: string,
 *  subpageParamName: string,
 *  proxyPath: string,
 *  subpagePathPrefix: string
 * }} config - An object containing configuration for the proxy handling.
 * @param {(string) => void} handler - An optional handler function to call with the redirect URL if a proxy is not available.
 * @return {Promise<void>}
 */
export const handleProxy404 = async (url, { pathPrefix, subpageParamName, proxyPath, subpagePathPrefix }, handler) => {
  const topicSlugId = detectTopicFromUrl(url, pathPrefix, subpageParamName);
  if (topicSlugId) {
    const changelogProxyAvailable = await fetch(proxyPath)
      .then((changelogProxyResponse) => changelogProxyResponse.ok)
      .catch(() => false);
    if (!changelogProxyAvailable) {
      if (handler) {
        handler(`${subpagePathPrefix}?${subpageParamName}=${topicSlugId}`);
      } else {
        window.location.href = `${subpagePathPrefix}?${subpageParamName}=${topicSlugId}`;
      }
    }
  }
};

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
  detectTopicFromUrl,
};
