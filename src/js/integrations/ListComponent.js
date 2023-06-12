function ListComponent()
{
  this.gridContainer = document.querySelector(".step_grid").parentNode;

  this.templateGrid = document.querySelector(".step_grid").cloneNode(true);
  this.templateGrid.querySelector(".step-list").innerHTML = "";
  
  this.templateStep = document.querySelector(".step-card").cloneNode(true);
  this.placeholderIcon = this.templateStep.querySelector("img").src;

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
            newCategoryLink.querySelector("div").innerHTML = integrations.categories.getItem(category).getName();
            newCategoryLink.href = "?category=" + category;
            cardHeaderContainer.appendChild(newCategoryLink);
            categoryCounter++;
          });

          newStep.querySelector("h2 a").innerHTML = step.getTitle();
          newStep.querySelector("h2 a").title = step.getTitle();
          newStep.querySelector("h2 a").href = "/integrations/step/" + slug;
          newStep.querySelector("p").innerHTML = step.getFormattedSummary();
  
          newGrid.querySelector(".step-list").appendChild(newStep);
        });
  
        this.gridContainer.appendChild(newGrid);
      }
    });
  }
}

export default ListComponent;