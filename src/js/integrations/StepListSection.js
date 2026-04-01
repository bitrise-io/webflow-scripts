import { getDocumentContext } from '../shared/context';
import Integrations from './Integrations';
import StepCardComponent from './StepCardComponent';

class StepListSection {
  constructor() {
    const { document } = getDocumentContext();
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
   */
  render(integrations) {
    const { document } = getDocumentContext();
    this.gridContainer.querySelectorAll('.step_grid').forEach((grid) => grid.classList.add('display-none'));

    integrations.categories.getItems().forEach((category) => {
      /** @type {string[]} */
      const matchingSteps = category.steps.filter((slug) => {
        return !integrations.steps[slug].isDeprecated();
      });

      if (matchingSteps.length > 0) {
        /** @type {HTMLElement} */
        const newGrid = this.templateGrid.cloneNode(true);
        newGrid.classList.remove('display-none');
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

  /**
   * Updates the visibility of steps and categories based on the provided filters.
   * @param {Integrations} integrations
   * @param {string} platformFilter
   * @param {string} categoryFilter
   * @param {string} queryFilter
   */
  update(integrations, platformFilter, categoryFilter, queryFilter) {
    integrations.categories.getItems().forEach((category) => {
      const categoryGrid = this.gridContainer.querySelector(`#category-${category.getSlug()}`)?.closest('.step_grid');
      if (categoryGrid) {
        /** @type {string[]} */
        const matchingSteps = category.steps.filter((slug) => {
          return (
            !integrations.steps[slug].isDeprecated() &&
            integrations.steps[slug].fitsCategory(categoryFilter) &&
            integrations.steps[slug].fitsPlatform(platformFilter) &&
            integrations.steps[slug].fitsQuery(queryFilter)
          );
        });

        categoryGrid.querySelectorAll('.step-card').forEach((card) => card.classList.add('display-none'));
        if (matchingSteps.length > 0) {
          matchingSteps.forEach((slug) =>
            categoryGrid.querySelector(`#step-${slug}`)?.classList.remove('display-none'),
          );
          categoryGrid.classList.remove('display-none');
        } else {
          categoryGrid.classList.add('display-none');
        }
      }
    });
  }
}

export default StepListSection;
