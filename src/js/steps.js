import DetailsSection from "./integrations/DetailsSection";
import HeaderSection from "./integrations/HeaderSection";
import IntegrationsService from "./integrations/IntegrationsService";

/** 
 * @param {URL} url
 * @returns {?string}
 */
function detectStepFromUrl(url) {
  let path = url.pathname;
  if (path.match(/steps\/?$/)) {
    path = path.replace(/\/$/, "") + "/" + url.searchParams.get("step");
  }

  const match = path.match(/steps\/(.+)$/);
  if (match) {
    return match[1];
  }
  return null;
}

const url = new URL(document.location.href);
const stepFilter = detectStepFromUrl(url);

const header = new HeaderSection();
const details = new DetailsSection();

IntegrationsService.loadIntegrations().then(integrations => {
  if (!stepFilter || !(stepFilter in integrations.steps)) {
    window.location.href = "/integrations/steps/not-found";  // 404
  } else {
    header.render(integrations, integrations.steps[stepFilter]);
    details.render(integrations, integrations.steps[stepFilter]);
  }
});
