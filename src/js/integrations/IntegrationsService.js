import Categories from "./Categories";
import Step from "./Step";


function IntegrationsService() {
  this.url = "https://bitrise-steplib-collection.s3.amazonaws.com/slim-spec.json.gz";
  this.loadIntegrations = () => {
    return fetch(this.url)
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
  }
}

export default new IntegrationsService();