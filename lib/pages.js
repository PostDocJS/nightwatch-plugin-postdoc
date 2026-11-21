const path = require('node:path');

// Set by the plugin's globals, and by `postdoc test`, to the folder with the page tests.
const PAGES_PATH_VARIABLE = 'POSTDOC_PAGES_PATH';
const DEFAULT_PAGES_PATH = 'test/pages';
const SCRIPT_RE = /\.[cm]?[jt]s$/;

/**
 * The folder with the page tests: the `postdoc.pages_path` setting, the folder that
 * `postdoc test` passes on, or `test/pages`.
 */
function resolvePagesPath(settings = {}) {
  return path.resolve(settings.postdoc?.pages_path ?? process.env[PAGES_PATH_VARIABLE] ?? DEFAULT_PAGES_PATH);
}

/**
 * Where a page test's page object is in `browser.page`, such as
 * `['api_reference', 'configuration']`, or null for files that aren't page tests.
 */
function getPageObjectPath(pagesPath, modulePath) {
  const relativePath = path.relative(pagesPath, modulePath);

  if (!SCRIPT_RE.test(modulePath) || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return relativePath.replace(SCRIPT_RE, '').split(path.sep);
}

module.exports = {
  PAGES_PATH_VARIABLE,
  resolvePagesPath,
  getPageObjectPath
};
