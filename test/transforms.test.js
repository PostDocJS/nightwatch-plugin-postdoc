const assert = require('node:assert/strict');
const {mkdirSync, mkdtempSync, rmSync, writeFileSync} = require('node:fs');
const {tmpdir} = require('node:os');
const path = require('node:path');
const {test} = require('node:test');

const {PAGES_PATH_VARIABLE} = require('../lib/pages.js');
const [transform] = require('../nightwatch/transforms.js');

const pagesPath = mkdtempSync(path.join(tmpdir(), 'pages-'));
const previousPagesPath = process.env[PAGES_PATH_VARIABLE];
process.env[PAGES_PATH_VARIABLE] = pagesPath;

test.after(() => {
  rmSync(pagesPath, {recursive: true});

  if (previousPagesPath === undefined) {
    delete process.env[PAGES_PATH_VARIABLE];
  } else {
    process.env[PAGES_PATH_VARIABLE] = previousPagesPath;
  }
});

function createBrowser(calls, isReady = true) {
  const page = {
    navigate: async () => calls.push('navigate'),
    element: (selector) => ({selector})
  };

  return {
    options: {postdoc: {ready_timeout: 300}},
    page: {api_reference: {configuration: () => page}},
    execute: async () => isReady,
    assert: {ok: () => calls.push('ready')},
    runA11yTests: async (options) => calls.push(['a11y', options])
  };
}

test('only takes files in the pages folder', () => {
  assert.equal(transform.filter(path.join(pagesPath, 'guide.js')), true);
  assert.equal(transform.filter(path.join(path.dirname(pagesPath), 'src', 'guide.js')), false);
});

test('opens the page and waits for PostDoc before the hooks and test cases', async () => {
  mkdirSync(path.join(pagesPath, 'api_reference'));
  const modulePath = path.join(pagesPath, 'api_reference', 'configuration.mjs');
  writeFileSync(modulePath, `
    export default {
      url: '/api/configuration.html',
      a11y: { selector: 'main' },
      before(browser) { browser.calls.push('user before'); }
    };

    export function exampleIsVisible({ browser, page, element }) {
      browser.calls.push(['test', page === browser.openedPage, element('@example').selector]);
    }
  `);

  const calls = [];
  const browser = createBrowser(calls);
  browser.calls = calls;

  const testSuite = await transform.requireTest(modulePath);

  assert.equal(testSuite.initialize, true);
  assert.deepEqual(Object.keys(testSuite).filter((key) => typeof testSuite[key] === 'function'), ['before', 'accessibility', 'exampleIsVisible']);

  await testSuite.before(browser);
  browser.openedPage = browser.page.api_reference.configuration();
  await testSuite.accessibility(browser);
  await testSuite.exampleIsVisible(browser);

  assert.deepEqual(calls, [
    'navigate',
    'ready',
    'user before',
    ['a11y', {page: 'api_reference/configuration', a11y_config: {selector: 'main'}}],
    ['test', true, '@example']
  ]);
});

test('stops before the test cases when the page does not finish rendering', async () => {
  const modulePath = path.join(pagesPath, 'api_reference', 'configuration.mjs');
  const testSuite = await transform.requireTest(modulePath);

  await assert.rejects(testSuite.before(createBrowser([], false)), /didn't finish rendering within 300 ms/);
});

test('explains a missing page object', async () => {
  const modulePath = path.join(pagesPath, 'missing.mjs');
  writeFileSync(modulePath, 'export default { url: \'/missing.html\' };');

  const testSuite = await transform.requireTest(modulePath);

  await assert.rejects(testSuite.before(createBrowser([])), /There is no page object for .*missing\.mjs/);
});
