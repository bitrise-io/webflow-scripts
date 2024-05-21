/**
 * @typedef {{
 *  url: string,
 *  title: string,
 *  selected: boolean,
 *  disabled: boolean
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
  }

  /** @param {HTMLElement} navItem */
  markNavItemSelected(navItem) {
    navItem.style.fontWeight = 'bold'; // TODO: move to webflow
  }

  /**
   * @param {NavigationItem[]} items
   * @param {{clickHandler: (event: Event, navItem: HTMLElement) => void}|null} options
   */
  render(items, options) {
    this.navContainer.querySelectorAll('a').forEach((el) => el.remove());

    items.forEach((item) => {
      const newNavItem = this.navItemTemplate.cloneNode(true);
      newNavItem.innerHTML = item.title;
      if (item.selected) {
        this.markNavItemSelected(newNavItem);
      }
      if (item.disabled) {
        newNavItem.className += ' disabled';
      }
      newNavItem.href = item.url;
      if (options && options.clickHandler) {
        newNavItem.addEventListener('click', (event) => {
          options.clickHandler(event, this);
        });
      }
      this.navContainer.appendChild(newNavItem);
    });
  }
}

export default NavigationList;
