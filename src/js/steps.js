import { fancyConsoleLog, setMetaContent } from "./common";
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
    const step = integrations.steps[stepFilter];

    document.title = `${step.title} | Bitrise Integration Steps`;
    document.querySelector("link[rel='canonical']").setAttribute("href", "https://bitrise.io/integrations/steps/" + step.key);
    setMetaContent({name: "description"}, step.summary.replace(/\s+/g, " "));
    setMetaContent({property: "og:title"}, `${step.title} | Bitrise Integration Steps`);
    setMetaContent({property: "og:description"}, step.summary.replace(/\s+/g, " "));
    setMetaContent({property: "og:image"}, step.svgIcon);
    setMetaContent({property: "twitter:title"}, `${step.title} | Bitrise Integration Steps`);
    setMetaContent({property: "twitter:description"}, step.summary.replace(/\s+/g, " "));
    setMetaContent({property: "twitter:image"}, step.svgIcon);

    header.render(integrations, step);
    details.render(integrations, step);

    fancyConsoleLog('Bitrise.io Integrations: ' + step.title);
  }  
});
