import { icaseEqual } from '../shared/common';
import Integrations from './Integrations';
import NavigationDropdown from './NavigationDropdown';
import NavigationList from './NavigationList';

class SidebarSection {
  constructor() {
    /** @type {HTMLElement} */
    this.sidebarContainer = document.querySelector('.integrations-sidebar');

    this.platformList = new NavigationList(this.sidebarContainer.querySelectorAll('.w-nav')[0]);
    this.categoryList = new NavigationList(this.sidebarContainer.querySelectorAll('.w-nav')[1]);

    this.platformDropdown = new NavigationDropdown(this.sidebarContainer.querySelectorAll('.w-dropdown')[0]);
    this.categoryDropdown = new NavigationDropdown(this.sidebarContainer.querySelectorAll('.w-dropdown')[1]);
  }

  getAnchorMarginTop() {
    return `-${120 + (this.sidebarContainer.offsetHeight > 10000 ? 10 : this.sidebarContainer.offsetHeight)}px`;
  }

  /**
   * @param {Integrations} integrations
   * @param {?string} platformFilter
   * @param {?string} categoryFilter
   * @param {?string} queryFilter
   */
  render(integrations, platformFilter, categoryFilter, queryFilter) {
    /** @type {import('./NavigationList').NavigationItem[]} */
    const platformItems = [];

    /** @type {import('./NavigationList').NavigationItem[]} */
    const categoryItems = [];

    if (platformFilter) {
      platformItems.push({
        url: document.location.pathname,
        title: 'All platforms',
        selected: false,
      });
    }

    integrations.platforms.getItems().forEach((platform) => {
      platformItems.push({
        url: `?platform=${platform.name}`,
        title: platform.getName(),
        selected: platformFilter && icaseEqual(platform.name, platformFilter),
      });
    });

    this.platformList.render(platformItems);
    this.platformDropdown.render(platformItems);

    if (categoryFilter) {
      categoryItems.push({
        url: document.location.pathname,
        title: 'All categories',
        selected: false,
      });
    }

    integrations.categories.getItems().forEach((category) => {
      /** @type {string[]} */
      const matchingSteps = category.steps.filter((slug) => {
        return (
          !integrations.steps[slug].isDeprecated() &&
          integrations.steps[slug].fitsCategory(categoryFilter) &&
          integrations.steps[slug].fitsPlatform(platformFilter) &&
          integrations.steps[slug].fitsQuery(queryFilter)
        );
      });

      if (matchingSteps.length > 0) {
        categoryItems.push({
          url: `#category-${category.name}`,
          title: category.getName(),
          selected: categoryFilter && icaseEqual(category.name, categoryFilter),
          disabled: false,
          count: matchingSteps.length,
        });
      } else {
        categoryItems.push({
          url: `#category-${category.name}`,
          title: category.getName(),
          selected: categoryFilter && icaseEqual(category.name, categoryFilter),
          disabled: true,
          count: 0,
        });
      }
    });

    this.categoryList.render(categoryItems, {
      clickHandler: () => {
        document.querySelectorAll('.category-anchor').forEach((element) => {
          element.style.marginTop = this.getAnchorMarginTop();
        });
      },
    });

    this.categoryDropdown.render(categoryItems, {
      clickHandler: (dropdown) => {
        document.querySelectorAll('.category-anchor').forEach((element) => {
          element.style.marginTop = this.getAnchorMarginTop();
        });
        dropdown.toggleDropdown();
      },
    });
  }
}

export default SidebarSection;
