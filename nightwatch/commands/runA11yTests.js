/**
 * Checks the accessibility of the current page with aXe. Each violation is listed in
 * the accessibility report at the end of the run, with the elements it affects.
 *
 * @param {object} options
 * @param {string} options.page The page's name in the report.
 * @param {object} options.a11y_config `enabled`, `selector` (`body` by default),
 *   `verbose` to list the passed rules too, `runAssertions` for one assertion per rule,
 *   and `config`: aXe run options.
 */
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

          // Without runAssertions, a page with no violations would show "No assertions
          // ran", as if nothing had been checked.
          if (!violations?.length && !runAssertions) {
            this.api.assert.ok(true, `No accessibility violations on ${page} (${passes?.length ?? 0} aXe rules passed)`);
          }

          if (results.violations && results.violations.length > 0) {
            const ruleIds = violations.map((violation) => violation.id).join(', ');
            const err = new Error(
              `${violations.length} accessibility violation(s) on ${page}: ${ruleIds}. ` +
              'The accessibility report at the end of the run lists the elements.'
            );
            err.showTrace = false;
            // The stack would only point at this command; the final summary shows it otherwise.
            err.stack = '';
            err.link = 'https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md';

            this.api.verify.fail(err);
          }
        });
    }
  }
};
