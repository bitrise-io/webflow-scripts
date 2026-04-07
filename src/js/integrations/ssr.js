import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { JSDOM } from 'jsdom';
import { renderStepList } from './renderStepList';
import { renderStepDetail } from './renderStepDetail';
import IntegrationsService from './IntegrationsService';

/**
 * @param {{ destination: string, templateHostname: string }} options
 */
export async function render({ destination, templateHostname }) {
  const [listTemplate, detailTemplate, integrations] = await Promise.all([
    fetch(`https://${templateHostname}/integrations?template=true`).then((r) => r.text()),
    fetch(`https://${templateHostname}/integrations/step`).then((r) => r.text()),
    IntegrationsService.loadIntegrations(),
  ]);

  const listDom = new JSDOM(listTemplate);
  renderStepList(listDom.window.document, integrations, new URL('https://bitrise.io/integrations'));
  const listPath = join(destination, 'integrations.html');
  await fs.mkdir(dirname(listPath), { recursive: true });
  await fs.writeFile(listPath, listDom.serialize());
  process.stdout.write(`Rendered ${listPath}\n`);

  const stepKeys = Object.keys(integrations.steps);
  const BATCH_SIZE = 20;
  const batches = Array.from({ length: Math.ceil(stepKeys.length / BATCH_SIZE) }, (_, i) =>
    stepKeys.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
  );

  const rendered = await batches.reduce(async (prevCount, batch) => {
    const count = await prevCount;
    const results = await Promise.all(
      batch.map(async (stepKey) => {
        const detailDom = new JSDOM(detailTemplate);
        const url = new URL(`https://bitrise.io/integrations/steps/${stepKey}`);
        const step = renderStepDetail(detailDom.window.document, integrations, url);
        if (step) {
          const stepPath = join(destination, 'integrations', `${stepKey}.html`);
          await fs.mkdir(dirname(stepPath), { recursive: true });
          await fs.writeFile(stepPath, detailDom.serialize());
          process.stdout.write(`Rendered ${stepPath}\n`);
          return 1;
        }
        return 0;
      }),
    );
    return count + results.reduce((a, b) => a + b, 0);
  }, Promise.resolve(0));

  process.stdout.write(`Integrations SSR: rendered integrations.html + ${rendered} step pages\n`);
}
