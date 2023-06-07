function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function icaseEqual(str1, str2) {
  return str1.search(new RegExp("^" + str2 + "$", "i")) > -1;
}

function icaseIncludes(str1, str2) {
  return str1.search(new RegExp(str2, "i")) > -1;
}

function Step(key, data)
{
  this.key = key;
  this.info = data.info;
  this.versions = data.versions;
  this.latestVersion = Object.keys(this.versions)[0];

  this.getCategories = () => this.versions[this.latestVersion].type_tags ? this.versions[this.latestVersion].type_tags : ['other'];
  this.getPlatforms = () => this.versions[this.latestVersion].project_type_tags;

  this.getSVGIcon = () => this.versions[this.latestVersion].asset_urls ? this.versions[this.latestVersion].asset_urls['icon.svg'] : null;
  this.getDescription = () => this.versions[this.latestVersion].description;
  this.getSummary = () => this.versions[this.latestVersion].summary;
  this.getTitle = () => this.versions[this.latestVersion].title;
  this.getKey = () => this.key;

  this.fitsPlatform = platform => 
    !platform ||
    !this.getPlatforms() ||
    this.getPlatforms().filter(plat => icaseEqual(plat, platform)).length > 0;

  this.fitsCategory = category =>
    !category || 
    this.getCategories().filter(cat => icaseEqual(cat, category)).length > 0;

  this.fitsQuery = query =>
    !query ||
    icaseIncludes(this.getKey(), query) ||
    icaseIncludes(this.getTitle(), query) ||
    icaseIncludes(this.getSummary(), query);
}

function Category(name)
{
  this.name = name;
  this.steps = [];

  this.add = slug => {
    this.steps.push(slug);
  };

  this.getName = () => {
    if (this.name == "ios") return "iOS";
    if (this.name == "macos") return "macOS";
    return capitalize(this.name.replace("-", " "));
  }
}

function Categories(title) {
  this.title = title;
  this.items = {};

  this.addStep = (key, slug) => {
    if (!(key in this.items)) {
      this.items[key] = new Category(key);
    }
    this.items[key].add(slug);
  }

  this.getItems = () => this.getKeys().map(key => this.items[key]);

  this.getKeys = () => Object.keys(this.items).sort();
}

function ContentComponent()
{
  this.gridContainer = document.querySelector(".step_grid").parentNode;

  this.templateGrid = document.querySelector(".step_grid").cloneNode(true);
  this.templateGrid.querySelector(".step-list").innerHTML = "";
  this.templateGrid.insertBefore(document.createElement("h3"), this.templateGrid.querySelector(".step-list-wrapper"));
  
  this.templateStep = document.querySelector(".step-card").cloneNode(true);
  this.placeholderIcon = this.templateStep.querySelector("img").src;

  this.md = markdownit();

  this.render = (integrations, platformFilter, categoryFilter, queryFilter) => {
    this.gridContainer.innerHTML = "";

    integrations.categories.getItems().forEach(category => {
      const matchingSteps = category.steps.filter(slug => {
        return integrations.steps[slug].fitsCategory(categoryFilter) &&
        integrations.steps[slug].fitsPlatform(platformFilter) &&
        integrations.steps[slug].fitsQuery(queryFilter);
      });

      if (matchingSteps.length > 0) {

        const newGrid = this.templateGrid.cloneNode(true);
        newGrid.querySelector("h3").innerHTML = category.getName();

        matchingSteps.forEach(slug => {
          const step = integrations.steps[slug];
          const newStep = this.templateStep.cloneNode(true);
          newStep.id = "step-" + slug;
          if (step.getSVGIcon()) newStep.querySelector("img").src = step.getSVGIcon();

          const cardHeaderContainer = newStep.querySelector("h2 + a").parentNode;
          const categoryLinkTemplate = newStep.querySelector("h2 + a").cloneNode(true);
          newStep.querySelector("h2 + a").remove();
          let categoryCounter = 0;
          step.getCategories().forEach(category => {
            if (categoryCounter > 0) {
              const categoryLinkSeparator = document.createElement("span");
              categoryLinkSeparator.innerHTML = ", ";
              cardHeaderContainer.appendChild(categoryLinkSeparator);
            }
            const newCategoryLink = categoryLinkTemplate.cloneNode(true);
            newCategoryLink.querySelector("div").innerHTML = capitalize(category).replace("-", " ");
            newCategoryLink.href = "?category=" + category;
            cardHeaderContainer.appendChild(newCategoryLink);
            categoryCounter++;
          });

          newStep.querySelector("h2 a").innerHTML = step.getTitle();
          newStep.querySelector("h2 a").title = step.getTitle();
          newStep.querySelector("h2 a").href = "/integrations/step/" + slug;
          newStep.querySelector("p").innerHTML = this.md.render(step.getSummary());
  
          newGrid.querySelector(".step-list").appendChild(newStep);
        });
  
        this.gridContainer.appendChild(newGrid);
      }
    });
  }
}

function SidebarComponent()
{
  this.sidebarContainer = document.querySelector(".step_grid").parentNode.parentNode.firstChild;

  this.platformNavigation = document.querySelectorAll("#" + this.sidebarContainer.id + " nav")[0];
  this.categoryNavigation = document.querySelectorAll("#" + this.sidebarContainer.id + " nav")[1];

  this.navItemTemplate = this.platformNavigation.querySelector("a").cloneNode(true);
  this.navItemTemplate.innerHTML = "";
  this.navItemTemplate.href = ""; 

  this.markNavItemSelected = navItem => {
    navItem.style.fontWeight = "bold";  // TODO: move to webflow
  };

  this.render = (integrations, platformFilter, categoryFilter) => {
    this.platformNavigation.querySelectorAll("a").forEach(el => el.remove());
    this.categoryNavigation.querySelectorAll("a").forEach(el => el.remove()); 

    if (platformFilter) {
      const allPlatformsNavItem = this.navItemTemplate.cloneNode(true);
      allPlatformsNavItem.innerHTML = "All platforms";
      allPlatformsNavItem.href = document.location.pathname;
      this.platformNavigation.appendChild(allPlatformsNavItem);
    }

    integrations.platforms.getItems().forEach(platform => {
      const newNavItem = this.navItemTemplate.cloneNode(true);
      newNavItem.innerHTML = platform.getName()
      if (platformFilter && icaseEqual(platform.name, platformFilter)) this.markNavItemSelected(newNavItem);
      newNavItem.href = "?platform=" + platform.name;
      this.platformNavigation.appendChild(newNavItem);
    });

    if (categoryFilter) {
      const allCategoriesNavItem = this.navItemTemplate.cloneNode(true);
      allCategoriesNavItem.innerHTML = "All categories";
      allCategoriesNavItem.href = document.location.pathname;
      this.categoryNavigation.appendChild(allCategoriesNavItem);  
    }

    integrations.categories.getItems().forEach(category => {
      const newNavItem = this.navItemTemplate.cloneNode(true);
      newNavItem.innerHTML = category.getName();
      if (categoryFilter && icaseEqual(category.name, categoryFilter)) this.markNavItemSelected(newNavItem);
      newNavItem.href = "?category=" + category.name;
      this.categoryNavigation.appendChild(newNavItem);
    });
  }
}

fetch("https://bitrise-steplib-collection.s3.amazonaws.com/slim-spec.json.gz")
  .then(response => response.json())
  .then(json => {
    /** PARSE STEPLIB */

    const integrations = {
      categories: new Categories("Category"),
      platforms: new Categories("Platform"),
      steps: {}
    };

    Object.keys(json.steps).map(slug => {
      const step = new Step(slug, json.steps[slug]);
      integrations.steps[slug] = step;

      step.getCategories().forEach(category => integrations.categories.addStep(category, slug));
      if (step.getPlatforms()) {
        step.getPlatforms().forEach(paltform => integrations.platforms.addStep(paltform, slug));
      }
    });

    return integrations;
  })
  .then(integrations => {
    const url = new URL(document.location.href);
    const platformFilter = url.searchParams.get("platform");
    const categoryFilter = url.searchParams.get("category");
    const queryFilter = url.searchParams.get("query");

    const content = new ContentComponent();
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

