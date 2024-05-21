import Integrations from './Integrations';
import StepCardComponent from './StepCardComponent';

class StepListSection {
  constructor() {
    /** @type {HTMLElement} */
    this.gridContainer = document.querySelector('.step_grid').parentNode;
    /** @type {HTMLElement} */
    this.templateGrid = document.querySelector('.step_grid').cloneNode(true);
    this.templateGrid.querySelector('.step-list').innerHTML = '';
    /** @type {HTMLElement} */
    this.templateStep = document.querySelector('.step-card').cloneNode(true);
  }

  /**
   * @param {Integrations} integrations
   * @param {?string} platformFilter
   * @param {?string} categoryFilter
   * @param {?string} queryFilter
   */
  render(integrations, platformFilter, categoryFilter, queryFilter) {
    this.gridContainer.innerHTML = '';

    integrations.categories.getItems().forEach((category) => {
      /** @type {string[]} */
      const matchingSteps = category.steps.filter((slug) => {
        return (
          integrations.steps[slug].fitsCategory(categoryFilter) &&
          integrations.steps[slug].fitsPlatform(platformFilter) &&
          integrations.steps[slug].fitsQuery(queryFilter)
        );
      });

      if (matchingSteps.length > 0) {
        /** @type {HTMLElement} */
        const newGrid = this.templateGrid.cloneNode(true);
        newGrid.querySelector('h3').innerHTML = category.getName();

        const categoryAnchor = document.createElement('a');
        categoryAnchor.id = `category-${category.getSlug()}`;
        categoryAnchor.className = 'category-anchor';
        categoryAnchor.style.position = 'absolute';
        newGrid.querySelector('h3').appendChild(categoryAnchor);

        matchingSteps.forEach((slug) => {
          const newStepCard = new StepCardComponent(this.templateStep.cloneNode(true));
          newStepCard.render(integrations, integrations.steps[slug]);
          newGrid.querySelector('.step-list').appendChild(newStepCard.element);
        });

        this.gridContainer.appendChild(newGrid);
      }
    });
  }
}

export default StepListSection;
