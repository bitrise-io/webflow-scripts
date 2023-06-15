import IntegrationsService from "./integrations/IntegrationsService";
import StepListSection from "./integrations/StepListSection";
import SidebarSection from "./integrations/SidebarSection";

const url = new URL(document.location.href);
const platformFilter = url.searchParams.get("platform");
const categoryFilter = url.searchParams.get("category");
const queryFilter = url.searchParams.get("query");

const content = new StepListSection();
const sidebar = new SidebarSection();

const searchField = document.getElementById("search");
searchField.parentNode.action = document.location.pathname;  // TODO: move to webflow
searchField.value = queryFilter;

IntegrationsService.loadIntegrations().then(integrations => {

  sidebar.render(integrations, platformFilter, categoryFilter);

  content.render(integrations, platformFilter, categoryFilter, queryFilter);
  
  searchField.addEventListener("keyup", event => {
    content.render(integrations, platformFilter, categoryFilter, event.target.value);
  });

  const match = window.location.hash.match(/category-(.*)/);
  if (match) {
    window.location.hash = "";
    window.setTimeout(() => {
      window.location.hash = "category-" + match[1];
    }, 500);  
  }

});
