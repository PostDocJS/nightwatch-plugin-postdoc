const requireModule = require('../lib/requireModule.js');

module.exports = [{
  name(exportName) {
    return `<${exportName}> component`;
  },

  showBrowserConsole: true,
  filter: /\.[jt]s$/,

  data(exportName) {
    return {};
  },

  onlyConditionFn({exportName}, argv = {}) {
    if (!argv.story) {
      return false;
    }

    return exportName.toLowerCase() === argv.story.toLowerCase();
  },

  async requireTest(modulePath, options, {argv, nightwatch_settings}) {
    const pageData = await requireModule(modulePath);

    const result = {
      browser: null,
      page: null,

      initialize: function(browser) {
        const page = browser.page.guide();
        this.page = page;
        this.browser = browser;

        page.navigate();

        if (pageData.a11y) {
          page.runA11yTests({
            page: 'homepage',
            a11y_config: pageData.a11y
          });
        }
      }
    }

    const hookNames = ['before', 'beforeEach', 'after', 'afterEach'];

    const testFunctions = Object.keys(pageData).reduce(function (acc, exportName) {
      const exportValue = pageData[exportName];

      if (typeof exportValue === 'function') {
        acc[exportName] = function(browser) {
          if (hookNames.includes(exportName)) {
            return exportValue(browser);
          }

          return exportValue({
            browser,
            page: result.page,
            element: result.page.element
          });
        };
      }

      return acc;
    }, result);

    return testFunctions;
  }
}
];