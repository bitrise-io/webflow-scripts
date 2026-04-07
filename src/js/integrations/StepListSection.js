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
    this.gridContainer.querySelectorAll('.step_grid').forEach((grid) => {
      if (grid.querySelector('.category-anchor')) {
        grid.remove();
      } else {
        grid.classList.add('display-none');
      }
    });

    const fragment = document.createDocumentFragment();

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

        fragment.appendChild(newGrid);
      }
    });

    this.gridContainer.appendChild(fragment);
  }

  /**
   * Updates the visibility of steps and categories based on the provided filters.
   * @param {Integrations} integrations
   * @param {string} platformFilter
   * @param {string} categoryFilter
   * @param {string} queryFilter
   */
  update(integrations, platformFilter, categoryFilter, queryFilter) {
    // Read phase: compute filter results and collect DOM references — no mutations
    const updates = integrations.categories.getItems().flatMap((category) => {
      const categoryGrid = this.gridContainer.querySelector(`#category-${category.getSlug()}`)?.closest('.step_grid');
      if (!categoryGrid) return [];

      /** @type {Set<string>} */
      const matchingSlugs = new Set(
        category.steps.filter(
          (slug) =>
            !integrations.steps[slug].isDeprecated() &&
            integrations.steps[slug].fitsCategory(categoryFilter) &&
            integrations.steps[slug].fitsPlatform(platformFilter) &&
            integrations.steps[slug].fitsQuery(queryFilter),
        ),
      );

      const cards = Array.from(categoryGrid.querySelectorAll('.step-card'));
      return [{ categoryGrid, matchingSlugs, cards }];
    });

    // Write phase: batch all DOM mutations in a single rAF
    requestAnimationFrame(() => {
      updates.forEach(({ categoryGrid, matchingSlugs, cards }) => {
        cards.forEach((card) => {
          card.classList.toggle('display-none', !matchingSlugs.has(card.id.slice('step-'.length)));
        });
        categoryGrid.classList.toggle('display-none', matchingSlugs.size === 0);
      });
    });
  }
}

export default StepListSection;
