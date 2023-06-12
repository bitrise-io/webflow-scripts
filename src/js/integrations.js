import IntegrationsService from "./integrations/IntegrationsService";
import ListComponent from "./integrations/ListComponent";
import SidebarComponent from "./integrations/SidebarComponent";


IntegrationsService.loadIntegrations().then(integrations => {
  const url = new URL(document.location.href);
  const platformFilter = url.searchParams.get("platform");
  const categoryFilter = url.searchParams.get("category");
  const queryFilter = url.searchParams.get("query");

  const content = new ListComponent();
  const sidebar = new SidebarComponent();

  sidebar.render(integrations, platformFilter, categoryFilter);

  content.render(integrations, platformFilter, categoryFilter, queryFilter);

  const searchField = document.getElementById("search");
  searchField.parentNode.action = document.location.pathname;  // TODO: move to webflow
  searchField.value = queryFilter;
  searchField.addEventListener("keyup", event => {
    content.render(integrations, platformFilter, categoryFilter, event.target.value);
  });

});
