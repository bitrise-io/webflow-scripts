import NavigationList from './NavigationList';

class NavigationDropdown extends NavigationList {
  /** @param {HTMLElement} container */
  constructor(container) {
    super(container);

    /** @type {HTMLElement} */
    this.dropdownToggle = this.container.querySelector('.w-dropdown-toggle');
  }

  toggleDropdown() {
    // TODO: doesn't work if resized from desktop to mobile view, maybe Webflow issue
    this.dropdownToggle.click();
  }

  /** @param {HTMLElement} navItem */
  markNavItemSelected(navItem) {
    super.markNavItemSelected(navItem);
    this.dropdownToggle.querySelectorAll('div')[1].innerHTML += `: <strong>${navItem.innerHTML}</strong>`;
  }
}

export default NavigationDropdown;
