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
  return str1.search(new RegExp("^" + str2 + "$", "i")) > -1;
}

/**
 * @param {string} str1
 * @param {string} str2
 * @returns {boolean}
 */
function icaseIncludes(str1, str2) {
  return str1.search(new RegExp(str2, "i")) > -1;
}

/**
 * Returns the pure text contents within a HTMLElement.
 * @param {HTMLElement} element 
 * @returns {string}
 */
function getElementTextContent(element) {
  return element.innerHTML.replace(/<[^>]+>/g, "").replace(/(^\s+|\s+$)/g, "");
}

/**
 * @param {Element} parent 
 * @param {string} className 
 * @returns {Element}
 */
function getFirstElementByClassname(parent, className) {
  const element = parent.getElementsByClassName(className)[0];
  if (!element) {
    throw `No element with class ${className} in DOM.`;
  }
  
  return element;
}

/**
 * @param {{name: string, property: string}} options 
 * @returns {HTMLMetaElement}
 */
function getMetaTag(options) {
  const key = "property" in options ? "property" : "name";

  /** @type {?HTMLMetaElement} */
  let metaTag = document.querySelector(`meta[${key}="${options[key]}"]`);
  if (!metaTag) {
    metaTag = document.createElement("meta");
    metaTag.setAttribute(key, options[key]);
    document.querySelector("head").appendChild(metaTag);
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

export {capitalize, icaseEqual, icaseIncludes, getElementTextContent, getFirstElementByClassname, getMetaTag, setMetaContent};