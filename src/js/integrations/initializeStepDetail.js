import { fancyConsoleLog } from '../shared/common';

/**
 * Initializes client-side behavior for the step detail page.
 * Expects document context to be already set.
 * @param {import('./Step').default} step
 */
export function initializeStepDetail(step) {
  fancyConsoleLog(`Bitrise.io Integrations: ${step.title}`);
}
