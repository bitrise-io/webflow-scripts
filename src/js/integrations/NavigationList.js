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
      this.navContainer.appendChild(newNavItem);
    });
  }

  /**
   * Attaches a click handler to all nav items (current and future renders).
   * @param {Function} handler
   */
  attachClickHandler(handler) {
    if (handler)
      this.navContainer.querySelectorAll('a').forEach((link) => {
        if (link.getAttribute('data-click-handler-attached') === 'true') {
          return;
        }
        link.addEventListener('click', (event) => {
          handler(event, this);
        });
        link.setAttribute('data-click-handler-attached', 'true');
      });
  }
}

export default NavigationList;
