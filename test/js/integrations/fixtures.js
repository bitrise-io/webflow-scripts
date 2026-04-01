import Integrations from '../../../src/js/integrations/Integrations';
import Step from '../../../src/js/integrations/Step';

/**
 * Creates a mock StepData object.
 * @param {Partial<import('../../../src/js/integrations/IntegrationsService').StepVersion>} [overrides]
 * @returns {import('../../../src/js/integrations/IntegrationsService').StepData}
 */
export function createStepData(overrides = {}) {
  return {
    info: {
      maintainer: 'bitrise',
      asset_urls: { 'icon.svg': 'https://example.com/icon.svg' },
      ...(overrides.info || {}),
    },
    versions: {
      '1.0.0': {
        title: overrides.title || 'Test Step',
        summary: overrides.summary || 'A test step summary',
        description: overrides.description || '# Test Step\n\nA test step description.',
        published_at: '2024-01-01T00:00:00Z',
        source: { git: 'https://github.com/test/step', commit: 'abc123' },
        source_code_url: overrides.source_code_url || 'https://github.com/test/step',
        support_url: 'https://github.com/test/step/issues',
        website: 'https://test.com',
        type_tags: overrides.type_tags || ['build'],
        project_type_tags: overrides.project_type_tags || ['ios', 'android'],
        ...(overrides.version || {}),
      },
    },
  };
}

/**
 * Creates a mock Integrations object with sample steps.
 * @returns {Integrations}
 */
export function createMockIntegrations() {
  const integrations = new Integrations();

  const stepsData = {
    'deploy-to-bitrise-io': createStepData({
      title: 'Deploy to Bitrise.io',
      summary: 'Deploys build artifacts to Bitrise',
      description: '## Deploy\n\nDeploys artifacts to Bitrise.io.',
      type_tags: ['deploy'],
      project_type_tags: ['ios', 'android'],
      source_code_url: 'https://github.com/bitrise-steplib/steps-deploy-to-bitrise-io',
    }),
    'xcode-build': createStepData({
      title: 'Xcode Build',
      summary: 'Builds an Xcode project',
      description: '## Build\n\nBuilds your Xcode project.',
      type_tags: ['build'],
      project_type_tags: ['ios', 'macos'],
      source_code_url: 'https://github.com/bitrise-steplib/steps-xcode-build',
    }),
    'gradle-runner': createStepData({
      title: 'Gradle Runner',
      summary: 'Runs Gradle tasks',
      description: '## Gradle\n\nRuns your Gradle tasks.',
      type_tags: ['build'],
      project_type_tags: ['android'],
      source_code_url: 'https://github.com/bitrise-steplib/steps-gradle-runner',
    }),
  };

  Object.keys(stepsData).forEach((slug) => {
    const step = new Step(slug, stepsData[slug]);
    integrations.steps[slug] = step;
    step.categories.forEach((category) => integrations.categories.addStep(category, slug));
    if (step.platforms) {
      step.platforms.forEach((platform) => integrations.platforms.addStep(platform, slug));
    }
  });

  return integrations;
}

/** Minimal HTML for step detail page */
export const STEP_DETAIL_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Integration Step</title>
  <link rel="canonical" href="https://bitrise.io/integrations/step">
  <meta name="description" content="">
  <meta property="og:title" content="">
  <meta property="og:description" content="">
  <meta property="og:image" content="">
  <meta property="twitter:title" content="">
  <meta property="twitter:description" content="">
  <meta property="twitter:image" content="">
</head>
<body>
  <img id="integrations-step-details-icon" src="">
  <h1 id="integrations-step-details-title"></h1>
  <p id="integrations-step-details-summary"></p>
  <div id="integrations-step-details-categories"><a href=""></a></div>
  <a id="integrations-step-details-github-buttom" href=""></a>
  <div id="integrations-step-details-description"><div></div></div>
  <div id="integrations-step-details-similar-steps">
    <div class="step-card">
      <img src="">
      <h2><a href=""></a></h2>
      <a href=""><div></div></a>
      <p></p>
    </div>
  </div>
</body>
</html>`;

/** Minimal HTML for integrations list page */
export const STEP_LIST_HTML = `<!DOCTYPE html>
<html>
<head><title>Integrations</title></head>
<body>
  <div class="integrations-sidebar">
    <div class="w-nav"><nav><a href=""></a></nav></div>
    <div class="w-nav"><nav><a href=""></a></nav></div>
    <div class="w-dropdown"><div class="w-dropdown-toggle"><div></div><div></div></div><nav><a href=""></a></nav></div>
    <div class="w-dropdown"><div class="w-dropdown-toggle"><div></div><div></div></div><nav><a href=""></a></nav></div>
  </div>
  <div>
    <div class="step_grid">
      <h3></h3>
      <div class="step-list">
        <div class="step-card">
          <img src="">
          <h2><a href=""></a></h2>
          <a href=""><div></div></a>
          <p></p>
        </div>
      </div>
    </div>
  </div>
  <input id="search" type="text">
</body>
</html>`;
