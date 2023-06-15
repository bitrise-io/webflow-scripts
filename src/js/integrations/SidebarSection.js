import Integrations from "./Integrations";
import { icaseEqual } from "../common";

class SidebarSection
{
  constructor() {
    /** @type {HTMLElement} */
    this.sidebarContainer = document.querySelector(".step_grid").parentNode.parentNode.firstChild;
    /** @type {HTMLElement} */
    this.platformNavigation = document.querySelectorAll("#" + this.sidebarContainer.id + " nav")[0];
    /** @type {HTMLElement} */
    this.categoryNavigation = document.querySelectorAll("#" + this.sidebarContainer.id + " nav")[1];

    /** @type {HTMLAnchorElement} */
    this.navItemTemplate = this.platformNavigation.querySelector("a").cloneNode(true);
    this.navItemTemplate.innerHTML = "";
    this.navItemTemplate.href = "";
  }

  /** @param {HTMLElement} navItem */
  markNavItemSelected(navItem) {
    navItem.style.fontWeight = "bold"; // TODO: move to webflow
  };

  /**
   * @param {Integrations} integrations 
   * @param {?string} platformFilter 
   * @param {?string} categoryFilter 
   */
  render(integrations, platformFilter, categoryFilter) {
    this.platformNavigation.querySelectorAll("a").forEach(el => el.remove());
    this.categoryNavigation.querySelectorAll("a").forEach(el => el.remove());

    if (platformFilter) {
      const allPlatformsNavItem = this.navItemTemplate.cloneNode(true);
      allPlatformsNavItem.innerHTML = "All platforms";
      allPlatformsNavItem.href = document.location.pathname;
      this.platformNavigation.appendChild(allPlatformsNavItem);
    }

    integrations.platforms.getItems().forEach(platform => {
      const newNavItem = this.navItemTemplate.cloneNode(true);
      newNavItem.innerHTML = platform.getName();
      if (platformFilter && icaseEqual(platform.name, platformFilter)) this.markNavItemSelected(newNavItem);
      newNavItem.href = "?platform=" + platform.name;
      this.platformNavigation.appendChild(newNavItem);
    });

    if (categoryFilter) {
      const allCategoriesNavItem = this.navItemTemplate.cloneNode(true);
      allCategoriesNavItem.innerHTML = "All categories";
      allCategoriesNavItem.href = document.location.pathname;
      this.categoryNavigation.appendChild(allCategoriesNavItem);
    }

    integrations.categories.getItems().forEach(category => {
      const newNavItem = this.navItemTemplate.cloneNode(true);
      newNavItem.innerHTML = category.getName();
      if (categoryFilter && icaseEqual(category.name, categoryFilter)) this.markNavItemSelected(newNavItem);
      newNavItem.href = "#category-" + category.name;
      this.categoryNavigation.appendChild(newNavItem);
    });
  };
}

export default SidebarSection;