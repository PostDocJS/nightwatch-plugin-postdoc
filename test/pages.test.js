const assert = require('node:assert/strict');
const path = require('node:path');
const {test} = require('node:test');

const {getPageObjectPath, resolvePagesPath, PAGES_PATH_VARIABLE} = require('../lib/pages.js');

const pagesPath = path.resolve('project', 'test', 'pages');

test('finds where a page test is in browser.page', () => {
  assert.deepEqual(getPageObjectPath(pagesPath, path.join(pagesPath, 'guide.js')), ['guide']);
  assert.deepEqual(getPageObjectPath(pagesPath, path.join(pagesPath, 'api_reference', 'configuration.mjs')), ['api_reference', 'configuration']);
});

test('treats files outside the pages folder, and files that are not scripts, as other tests', () => {
  assert.equal(getPageObjectPath(pagesPath, path.resolve('project', 'test', 'src', 'guide.js')), null);
  assert.equal(getPageObjectPath(pagesPath, path.resolve('project', 'test', 'pages-old', 'guide.js')), null);
  assert.equal(getPageObjectPath(pagesPath, path.join(pagesPath, 'notes.md')), null);
});

test('reads the pages folder from the settings, then the environment, then uses test/pages', (t) => {
  const previousValue = process.env[PAGES_PATH_VARIABLE];
  t.after(() => {
    if (previousValue === undefined) {
      delete process.env[PAGES_PATH_VARIABLE];
    } else {
      process.env[PAGES_PATH_VARIABLE] = previousValue;
    }
  });

  delete process.env[PAGES_PATH_VARIABLE];
  assert.equal(resolvePagesPath(), path.resolve('test', 'pages'));

  process.env[PAGES_PATH_VARIABLE] = '/site/checks/pages';
  assert.equal(resolvePagesPath(), path.resolve('/site/checks/pages'));
  assert.equal(resolvePagesPath({postdoc: {pages_path: 'e2e/pages'}}), path.resolve('e2e', 'pages'));
});
