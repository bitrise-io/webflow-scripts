/**
 * @typedef {{
 *  url: string,
 *  title: string,
 *  selected: boolean,
 *  disabled: boolean,
 *  count?: number,
 * }} NavigationItem
 */

class NavigationList {
  /** @param {HTMLElement} container */
  constructor(container) {
    /** @type {HTMLElement} */
    this.container = container;

    /** @type {HTMLElement} */
    this.navContainer = this.container.querySelector('nav');

    /** @type {HTMLAnchorElement} */
    this.navItemTemplate = this.navContainer.querySelector('a').cloneNode(true);
    this.navItemTemplate.innerHTML = '';
    this.navItemTemplate.href = '';

    /** @type {Function|null} */
    this.clickHandler = null;
  }

  /** @param {HTMLElement} navItem */
  markNavItemSelected(navItem) {
    navItem.style.fontWeight = 'bold'; // TODO: move to webflow
  }

  /**
   * @param {NavigationItem[]} items
   */
  render(items) {
    this.navContainer.querySelectorAll('a').forEach((el) => el.remove());

    items.forEach((item) => {
      const newNavItem = this.navItemTemplate.cloneNode(true);
      newNavItem.innerHTML = `${item.title} ${item.count ? `<span>(${item.count})</span>` : ''}`;
      if (item.selected) {
        this.markNavItemSelected(newNavItem);
      }
      if (item.disabled) {
        newNavItem.className += ' disabled';
      }
      newNavItem.href = item.url;
      if (this.clickHandler) {
        newNavItem.addEventListener('click', (event) => {
          this.clickHandler(event, this);
        });
      }
      this.navContainer.appendChild(newNavItem);
    });
  }

  /**
   * Attaches a click handler to all nav items (current and future renders).
   * @param {Function} handler
   */
  attachClickHandler(handler) {
    this.clickHandler = handler;
  }
}

export default NavigationList;
