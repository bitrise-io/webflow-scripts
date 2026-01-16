import Integrations from './Integrations';
import Step from './Step';
import StepCardComponent from './StepCardComponent';

class DetailsSection {
  constructor() {
    /** @type {HTMLAnchorElement} */
    this.githubButton = document.getElementById('integrations-step-details-github-buttom');

    /** @type {HTMLElement} */
    this.descriptionContainer = document.querySelector('#integrations-step-details-description > div');

    /** @type {HTMLElement} */
    this.similarStepsContainer = document.getElementById('integrations-step-details-similar-steps');

    /** @type {HTMLElement} */
    this.templateStep = this.similarStepsContainer.querySelector('.step-card').cloneNode(true);
  }

  /**
   * @param {string} title
   * @returns {string[]}
   */
  getTitleComponents(title) {
    return title
      .toLocaleLowerCase()
      .split(' ')
      .filter((word) => {
        return ['a', 'an', 'and', 'by', 'can', 'for', 'in', 'of', 'on', 'the'].indexOf(word) === -1;
      });
  }

  /**
   * @param {Integrations} integrations
   * @param {Step} step
   */
  render(integrations, step) {
    const deprecationNotice = step.isDeprecated()
      ? `<blockquote class="book-hint warning">
        ⚠️ &nbsp; ${step.deprecateNotes}
      </blockquote>`
      : '';

    this.githubButton.href = step.sourceCodeUrl;

    const description = step.formattedDescription
      .replace(/www\.bitrise\.io/gi, 'bitrise.io')
      .replace(/http:/gi, 'https:');
    this.descriptionContainer.innerHTML = `${deprecationNotice}${description}`;

    this.similarStepsContainer.innerHTML = '';
    const similarSteps = Object.values(integrations.steps)
      .filter((step2) => !step2.isDeprecated())
      .map((step2) => {
        return {
          step: step2,
          categoryScore: step2.categories.filter((category) => step.categories.indexOf(category) > -1).length,
          titleScore: this.getTitleComponents(step2.title).filter(
            (category) => this.getTitleComponents(step.title).indexOf(category) > -1,
          ).length,
        };
      })
      .filter((scoredStep) => {
        return (scoredStep.categoryScore > 0 || scoredStep.titleScore > 0) && scoredStep.step.key !== step.key;
      })
      .sort((scoredStep1, scoredStep2) => {
        return scoredStep2.categoryScore - scoredStep1.categoryScore;
      })
      .sort((scoredStep1, scoredStep2) => {
        return scoredStep2.titleScore - scoredStep1.titleScore;
      })
      .map((scoredStep) => scoredStep.step)
      .slice(0, 4);

    similarSteps.forEach((similarStep) => {
      const newStepCard = new StepCardComponent(this.templateStep.cloneNode(true));
      newStepCard.render(integrations, similarStep);
      this.similarStepsContainer.appendChild(newStepCard.element);
    });
  }
}

export default DetailsSection;
