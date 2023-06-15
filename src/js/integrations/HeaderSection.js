import Integrations from "./Integrations";
import Step from "./Step";


class HeaderSection
{
  constructor() {
    /** @type {HTMLImageElement} */
    this.headerIcon = document.getElementById("integrations-step-details-icon");
    /** @type {HTMLHeadingElement} */
    this.headerTitle = document.getElementById("integrations-step-details-title");
    /** @type {HTMLParagraphElement} */
    this.headerSummary = document.getElementById("integrations-step-details-summary");
    /** @type {HTMLDivElement} */
    this.headerCategoriesContainer = document.getElementById("integrations-step-details-categories");
    /** @type {HTMLAnchorElement} */
    this.headerCategoryLinkTemplate = this.headerCategoriesContainer.querySelector("a");
  }

  /**
   * @param {Integrations} integrations
   * @param {Step} step
   */
  render(integrations, step) {
    if (step.svgIcon) this.headerIcon.src = step.svgIcon;
    this.headerTitle.innerHTML = step.title;
    this.headerSummary.innerHTML = step.formattedSummary;
    this.headerCategoriesContainer.innerHTML = "";

    let categoryCounter = 0;
    step.categories.forEach(category => {
      if (categoryCounter > 0) {
        const categoryLinkSeparator = document.createElement("span");
        categoryLinkSeparator.innerHTML = ", ";
        this.headerCategoriesContainer.appendChild(categoryLinkSeparator);
      }
      const newCategoryLink = this.headerCategoryLinkTemplate.cloneNode(true);
      newCategoryLink.innerHTML = integrations.categories.getItem(category).getName();
      newCategoryLink.href = "/integrations#category-" + category;
      this.headerCategoriesContainer.appendChild(newCategoryLink);
      categoryCounter++;
    });
  };
}

export default HeaderSection;