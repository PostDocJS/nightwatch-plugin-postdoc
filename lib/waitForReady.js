const DEFAULT_READY_TIMEOUT = 10000;
const POLL_INTERVAL = 100;

/**
 * Waits until PostDoc has rendered the current page and marked `<html>` with
 * `data-postdoc-ready`. Resolves with the time it took in milliseconds, or -1 when
 * the page isn't ready within `timeout`.
 *
 * It polls from Node rather than in the browser, so the browser's script timeout
 * doesn't limit how long the wait can be.
 */
async function waitForReady(api, timeout = DEFAULT_READY_TIMEOUT) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const isReady = await api.execute(function () {
      return document.documentElement.hasAttribute('data-postdoc-ready');
    });

    if (isReady === true) {
      return Date.now() - start;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }

  return -1;
}

function createNotReadyError(timeout = DEFAULT_READY_TIMEOUT) {
  const error = new Error(
    `The page didn't finish rendering within ${timeout} ms. ` +
    'It may not be a PostDoc page, such as a 404 page, or one of its onRender callbacks never finishes.'
  );

  // The stack would only point at the plugin, which tells the reader nothing.
  error.showTrace = false;
  error.stack = '';

  return error;
}

module.exports = {
  DEFAULT_READY_TIMEOUT,
  waitForReady,
  createNotReadyError
};
