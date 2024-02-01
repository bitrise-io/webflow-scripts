import Integrations from "./Integrations";
import Step from "./Step";


class StepCardComponent
{
  /** @param {HTMLElement} element */
  constructor(element) {
    /** @type {HTMLElement} */
    this.element = element;
    /** @type {HTMLImageElement} */
    this.cardHeaderIcon = this.element.querySelector("img");
    /** @type {HTMLAnchorElement} */
    this.cardHeaderTitleLink = this.element.querySelector("h2 a");
    /** @type {HTMLElement} */
    this.cardHeaderContainer = this.element.querySelector("h2 + a").parentNode;
    /** @type {HTMLAnchorElement} */
    this.cardHeadercategoryLinkTemplate = this.element.querySelector("h2 + a").cloneNode(true);
    this.element.querySelector("h2 + a").remove();
    /** @type {HTMLParagraphElement} */
    this.cardSummary = this.element.querySelector("p");

    /** @type {HTMLAnchorElement} */
    this.cardLink = document.createElement("a");
    this.cardLink.style.position = "absolute";
    this.cardLink.style.top = "0px";
    this.cardLink.style.bottom = "0px";
    this.cardLink.style.left = "0px";
    this.cardLink.style.right = "0px";
    this.cardSummary.parentNode.style.position = "relative";
    this.cardSummary.parentNode.appendChild(this.cardLink);
  }

  /** 
   * @param {Integrations} integrations
   * @param {Step} step
   */
  render(integrations, step) {
    this.element.id = "step-" + step.key;

    this.cardHeaderIcon.loading = "lazy";
    this.cardHeaderIcon.width = 48;
    this.cardHeaderIcon.height = 48;
    if (step.svgIcon) this.cardHeaderIcon.src = step.svgIcon;

    this.cardHeaderTitleLink.innerHTML = step.title;
    this.cardHeaderTitleLink.title = step.title;
    this.cardLink.title = step.title;

    if (location.hostname.match(/bitrise\.io|localhost|127\.0\.0\.1/)) {
      this.cardHeaderTitleLink.href = "/integrations/steps/" + step.key;
      this.cardLink.href = "/integrations/steps/" + step.key;
    } else {
      this.cardHeaderTitleLink.href = "/integrations/steps?step=" + step.key;
      this.cardLink.href = "/integrations/steps?step=" + step.key;
    }

    this.cardSummary.innerHTML = step.formattedSummary;

    /** @type {HTMLAnchorElement} */
    let categoryCounter = 0;
    step.categories.forEach(category => {
      if (categoryCounter > 0) {
        /** @type {HTMLSpanElement} */
        const categoryLinkSeparator = document.createElement("span");
        categoryLinkSeparator.innerHTML = ", ";
        this.cardHeaderContainer.appendChild(categoryLinkSeparator);
      }
      /** @type {HTMLAnchorElement} */
      const newCategoryLink = this.cardHeadercategoryLinkTemplate.cloneNode(true);
      newCategoryLink.querySelector("div").innerHTML = integrations.categories.getItem(category).getName();
      newCategoryLink.href = "#category-" + category;
      this.cardHeaderContainer.appendChild(newCategoryLink);
      categoryCounter++;
    });
  }
}

export default StepCardComponent;