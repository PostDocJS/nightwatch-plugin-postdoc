const {DEFAULT_READY_TIMEOUT, waitForReady, createNotReadyError} = require('../../lib/waitForReady.js');

/**
 * Waits until PostDoc has rendered the current page: its `onRender` callbacks have
 * finished, so content drawn in the browser, such as diagrams, is in place. PostDoc
 * marks such a page with a `data-postdoc-ready` attribute on `<html>`, also after
 * moving to another page without a reload.
 *
 * Fails the test case when the page isn't ready within `timeout` milliseconds.
 *
 * @example
 * browser.click('a[href$="/guide/index.html"]').waitForPostDocReady();
 */
module.exports = class WaitForPostDocReadyCommand {
  async command(timeout = this.api.options?.postdoc?.ready_timeout ?? DEFAULT_READY_TIMEOUT) {
    const renderTime = await waitForReady(this.api, timeout);

    if (renderTime < 0) {
      this.api.assert.fail(createNotReadyError(timeout));

      return false;
    }

    this.api.assert.ok(true, `PostDoc finished rendering the page in ${renderTime} ms`);

    return true;
  }
};
