const {existsSync} = require('node:fs');
const path = require('node:path');

const {PAGES_PATH_VARIABLE, resolvePagesPath} = require('../lib/pages.js');
const {startPostDocServer, stopPostDocServer} = require('../lib/postdocServer.js');

// The address of the site under test. `postdoc test` sets it when it serves the build;
// otherwise the plugin starts the dev server and sets it.
const BASE_URL_VARIABLE = 'POSTDOC_BASE_URL';

let server = null;

// Page tests are page objects too, so their folder is added to the page objects.
function registerPageTests(settings) {
  const pagesPath = resolvePagesPath(settings);

  // The transform and parallel workers read the folder from here.
  process.env[PAGES_PATH_VARIABLE] = pagesPath;

  if (!existsSync(pagesPath)) {
    return;
  }

  const pageObjectPaths = [].concat(settings.page_objects_path ?? []);

  if (!pageObjectPaths.some((pageObjectPath) => path.resolve(pageObjectPath) === pagesPath)) {
    settings.page_objects_path = [...pageObjectPaths, pagesPath];
  }
}

function useSiteAddress(settings) {
  const baseUrl = process.env[BASE_URL_VARIABLE];

  if (baseUrl) {
    settings.launch_url = baseUrl;
    settings.launchUrl = baseUrl;
  }
}

module.exports = {
  // Runs once, in the main process.
  async before(settings) {
    registerPageTests(settings);

    if (!process.env[BASE_URL_VARIABLE] && settings.postdoc?.start_server !== false) {
      server = await startPostDocServer();
      process.env[BASE_URL_VARIABLE] = server.url;

      process.stdout.write(`The PostDoc dev server is running at ${server.url}\n`);
    }

    useSiteAddress(settings);
  },

  // Runs in each worker when tests run in parallel. Workers inherit the environment
  // variables the main process set in before().
  async beforeChildProcess(settings) {
    registerPageTests(settings);
    useSiteAddress(settings);
  },

  async after() {
    if (server) {
      stopPostDocServer(server);
      server = null;
    }
  }
};
