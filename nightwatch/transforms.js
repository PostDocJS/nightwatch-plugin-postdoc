const {getPageObjectPath, resolvePagesPath} = require('../lib/pages.js');
const loadPageTest = require('../lib/loadPageTest.js');
const {DEFAULT_READY_TIMEOUT, waitForReady, createNotReadyError} = require('../lib/waitForReady.js');

const HOOKS = ['before', 'after', 'beforeEach', 'afterEach'];

// Hooks may take a `done` callback instead of returning a promise.
function runHook(hook, browser) {
  if (hook.length > 1) {
    return new Promise((resolve) => hook(browser, resolve));
  }

  return hook(browser);
}

function createPage(browser, pageObjectPath, modulePath) {
  const createPageObject = pageObjectPath.reduce((namespace, name) => namespace?.[name], browser.page);

  if (typeof createPageObject !== 'function') {
    throw new Error(
      `There is no page object for ${modulePath}. ` +
      'Page tests have to be in the folder that the plugin adds to "page_objects_path".'
    );
  }

  return createPageObject();
}

/**
 * Turns a page test into a Nightwatch test suite. A page test is a module in the pages
 * folder whose default export is a Nightwatch page object, with two additions:
 *
 * - `a11y` settings, which add an accessibility test of the page;
 * - `before`, `after`, `beforeEach` and `afterEach` hooks.
 *
 * Its named exports that are functions become test cases. They receive the page object
 * as `page`, its element API as `element`, and `browser`. The suite opens the page and
 * waits until PostDoc has rendered it before the first test case.
 */
module.exports = [{
  filter(modulePath) {
    return getPageObjectPath(resolvePagesPath(), modulePath) !== null;
  },

  async requireTest(modulePath) {
    const {definition, namedExports} = await loadPageTest(modulePath);
    const pageObjectPath = getPageObjectPath(resolvePagesPath(), modulePath);
    const hooks = Object.fromEntries(
      HOOKS
        .map((name) => [name, namedExports[name] ?? definition[name]])
        .filter(([, hook]) => typeof hook === 'function')
    );

    let page;

    const testSuite = {
      // Nightwatch only uses a module returned by a transform that has this property.
      initialize: true,

      async before(browser) {
        page = createPage(browser, pageObjectPath, modulePath);

        await page.navigate();

        const readyTimeout = browser.options?.postdoc?.ready_timeout ?? DEFAULT_READY_TIMEOUT;
        const renderTime = await waitForReady(browser, readyTimeout);

        // An error from the before hook makes Nightwatch skip the test cases, which
        // would only fail on a page that didn't render.
        if (renderTime < 0) {
          throw createNotReadyError(readyTimeout);
        }

        browser.assert.ok(true, `PostDoc finished rendering the page in ${renderTime} ms`);

        if (hooks.before) {
          await runHook(hooks.before, browser);
        }
      }
    };

    for (const name of ['after', 'beforeEach', 'afterEach']) {
      if (hooks[name]) {
        testSuite[name] = hooks[name];
      }
    }

    if (definition.a11y && definition.a11y.enabled !== false) {
      testSuite.accessibility = (browser) => browser.runA11yTests({
        page: pageObjectPath.join('/'),
        a11y_config: definition.a11y
      });
    }

    for (const [name, testCase] of Object.entries(namedExports)) {
      if (typeof testCase === 'function' && !HOOKS.includes(name)) {
        testSuite[name] = (browser) => testCase({
          browser,
          page,
          element: (...args) => page.element(...args)
        });
      }
    }

    return testSuite;
  }
}];
