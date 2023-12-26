module.exports = class RunA11yTestsCommand {

  async command({page, a11y_config = {enabled: false}} = {}) {
    const {enabled = true, verbose = false, runAssertions = false, selector = 'body'} = a11y_config;

    if (enabled) {
      await this.api
        .axeInject()
        .axeRun(selector, {
          runAssertions,
          ...a11y_config.config
        }, (results) => {
          if (results.error) {
            throw new Error(`Error while running accessibility tests: axeRun(): ${results.error}`);
          }

          const {passes, violations} = results;
          this.client.reporter.setAxeResults({
            verbose,
            passes,
            violations,
            component: page
          });
          this.client.reporter.printA11yReport();

          if (results.violations && results.violations.length > 0) {
            const err = new Error('There are accessibility violations; please see the complete report for details.');
            err.showTrace = false;
            err.link = 'https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md';

            this.api.verify.fail(err);
          }
        });
    }
  }
};
