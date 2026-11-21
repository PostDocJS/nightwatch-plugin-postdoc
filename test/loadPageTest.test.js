const assert = require('node:assert/strict');
const {mkdtempSync, rmSync, writeFileSync} = require('node:fs');
const {tmpdir} = require('node:os');
const path = require('node:path');
const {test} = require('node:test');

const loadPageTest = require('../lib/loadPageTest.js');

const directory = mkdtempSync(path.join(tmpdir(), 'page-tests-'));
test.after(() => rmSync(directory, {recursive: true}));

test('reads the page object and the test cases of an ES module', async () => {
  const modulePath = path.join(directory, 'guide.mjs');
  writeFileSync(modulePath, `
    export default { url: '/guide/index.html', a11y: { enabled: true } };
    export function sidebarIsVisible() {}
  `);

  const {definition, namedExports} = await loadPageTest(modulePath);

  assert.deepEqual(definition, {url: '/guide/index.html', a11y: {enabled: true}});
  assert.deepEqual(Object.keys(namedExports), ['sidebarIsVisible']);
});

test('reads a CommonJS module, which exports everything in one object', async () => {
  const modulePath = path.join(directory, 'index.cjs');
  writeFileSync(modulePath, `
    module.exports = { url: '/index.html', heroIsVisible() {} };
  `);

  const {definition, namedExports} = await loadPageTest(modulePath);

  assert.equal(definition.url, '/index.html');
  assert.equal(typeof namedExports.heroIsVisible, 'function');
});
