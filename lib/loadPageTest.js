const {pathToFileURL} = require('node:url');

/**
 * Loads a page test. In an ES module, the default export is the page object and the
 * named exports are the test cases and hooks. A CommonJS module exports all of them
 * in one object.
 */
async function loadPageTest(modulePath) {
  let moduleExports;

  try {
    moduleExports = require(modulePath);
  } catch (error) {
    if (error.message === 'Cannot use import statement outside a module' || error.message === 'Unexpected token \'export\'') {
      error.help = ['Using ES6 import/export syntax? Make sure to specify "type": "module" in your package.json or use the .mjs extension.'];
      error.link = 'https://nodejs.org/api/esm.html';

      throw error;
    }

    if (error.code !== 'ERR_REQUIRE_ESM' && error.code !== 'ERR_REQUIRE_ASYNC_MODULE') {
      throw error;
    }

    moduleExports = await import(pathToFileURL(modulePath).href);
  }

  if (moduleExports?.[Symbol.toStringTag] === 'Module' || moduleExports?.__esModule) {
    // Node adds __esModule when an ES module is loaded with require().
    const {default: definition = {}, __esModule, ...namedExports} = moduleExports;

    return {definition, namedExports};
  }

  return {definition: moduleExports ?? {}, namedExports: moduleExports ?? {}};
}

module.exports = loadPageTest;
