import Integrations from "./Integrations";
import { icaseEqual } from "../shared/common";


/**
 * @typedef {{
 *  url: string,
 *  title: string,
 *  selected: boolean,
 *  disabled: boolean
 * }} NavigationItem
 */

class NavigationList
{
  /** @param {HTMLElement} container */
  constructor(container) {
    /** @type {HTMLElement} */
    this.container = container;

    /** @type {HTMLElement} */
    this.navContainer = this.container.querySelector("nav");

    /** @type {HTMLAnchorElement} */
    this.navItemTemplate = this.navContainer.querySelector("a").cloneNode(true);
    this.navItemTemplate.innerHTML = "";
    this.navItemTemplate.href = "";
  }

  /** @param {HTMLElement} navItem */
  markNavItemSelected(navItem) {
    navItem.style.fontWeight = "bold"; // TODO: move to webflow
  };

  /** 
   * @param {NavigationItem[]} items
   * @param {{clickHandler: (event: Event, navItem: HTMLElement) => void}|null} options
   */
  render(items, options) {
    this.navContainer.querySelectorAll("a").forEach(el => el.remove());

    items.forEach(item => {
      const newNavItem = this.navItemTemplate.cloneNode(true);
      newNavItem.innerHTML = item.title;
      if (item.selected) {
        this.markNavItemSelected(newNavItem);
      }
      if (item.disabled) {
        newNavItem.className += " disabled";
      }
      newNavItem.href = item.url;
      if (options && options.clickHandler) {
        newNavItem.addEventListener("click", event => {
          options.clickHandler(event, this);
        });  
      }
      this.navContainer.appendChild(newNavItem);
    });
  }
}

class NavigationDropdown extends NavigationList {
  /** @param {HTMLElement} container */
  constructor(container) {
    super(container);

    /** @type {HTMLElement} */
    this.dropdownToggle = this.container.querySelector(".w-dropdown-toggle");
  }

  toggleDropdown() {
    // TODO: doesn't work if resized from desktop to mobile view, maybe Webflow issue
    this.dropdownToggle.click();
  }

  /** @param {HTMLElement} navItem */
  markNavItemSelected(navItem) {
    super.markNavItemSelected(navItem);
    this.dropdownToggle.querySelectorAll("div")[1].innerHTML += ": <strong>" + navItem.innerHTML + "</strong>";
  }
}

class SidebarSection
{
  constructor() {
    /** @type {HTMLElement} */
    this.sidebarContainer = document.querySelector(".integrations-sidebar");

    this.platformList = new NavigationList(this.sidebarContainer.querySelectorAll(".w-nav")[0]);
    this.categoryList = new NavigationList(this.sidebarContainer.querySelectorAll(".w-nav")[1]);

    this.platformDropdown = new NavigationDropdown(this.sidebarContainer.querySelectorAll(".w-dropdown")[0]);
    this.categoryDropdown = new NavigationDropdown(this.sidebarContainer.querySelectorAll(".w-dropdown")[1]);
  }

  getAnchorMarginTop() {
    return "-" + (120  + (this.sidebarContainer.offsetHeight > 10000 ? 10 : this.sidebarContainer.offsetHeight)) + "px";
  }

  /**
   * @param {Integrations} integrations 
   * @param {?string} platformFilter 
   * @param {?string} categoryFilter
   * @param {?string} queryFilter
   */
  render(integrations, platformFilter, categoryFilter, queryFilter) {
    /** @type {NavigationItem[]} */
    const platformItems = [];

    /** @type {NavigationItem[]} */
    const categoryItems = [];

    if (platformFilter) {
      platformItems.push({
        url: document.location.pathname,
        title: "All platforms",
        selected: false
      });
    }

    integrations.platforms.getItems().forEach(platform => {
      platformItems.push({
        url: "?platform=" + platform.name,
        title: platform.getName(),
        selected: platformFilter && icaseEqual(platform.name, platformFilter)
      });
    });

    this.platformList.render(platformItems);
    this.platformDropdown.render(platformItems);

    if (categoryFilter) {
      categoryItems.push({
        url: document.location.pathname,
        title: "All categories",
        selected: false
      });
    }

    integrations.categories.getItems().forEach(category => {
      /** @type {string[]} */
      const matchingSteps = category.steps.filter(slug => {
        return integrations.steps[slug].fitsCategory(categoryFilter) &&
          integrations.steps[slug].fitsPlatform(platformFilter) &&
          integrations.steps[slug].fitsQuery(queryFilter);
      });

      if (matchingSteps.length > 0) {
        categoryItems.push({
          url: "#category-" + category.name,
          title: category.getName(),
          selected: categoryFilter && icaseEqual(category.name, categoryFilter),
          disabled: false
        });
      } else {
        categoryItems.push({
          url: "#category-" + category.name,
          title: category.getName(),
          selected: categoryFilter && icaseEqual(category.name, categoryFilter),
          disabled: true
        });
      }
    });

    this.categoryList.render(categoryItems, {
      clickHandler: (event, navItem) => {
        document.querySelectorAll(".category-anchor").forEach(element => {
          element.style.marginTop = this.getAnchorMarginTop();
        });
      }
    });

    this.categoryDropdown.render(categoryItems, {
      clickHandler: (event, dropdown) => {
          document.querySelectorAll(".category-anchor").forEach(element => {
            element.style.marginTop = this.getAnchorMarginTop();
          });
          dropdown.toggleDropdown();
        }
    })
  };
}

export default SidebarSection;