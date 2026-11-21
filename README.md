# nightwatch-plugin-postdoc

A [Nightwatch](https://nightwatchjs.org) plugin for testing [PostDoc](https://postdoc.dev) websites. It adds:

- **page tests**: one file per page, which is both a page object and a test suite;
- a **ready signal**: tests start once PostDoc has rendered the page, including content drawn in the browser such as diagrams;
- an **accessibility command** based on the aXe support built into Nightwatch.

## Requirements

- Nightwatch 3.15 or newer
- A PostDoc version that marks rendered pages with `data-postdoc-ready`

## Install

```sh
npm install --save-dev nightwatch nightwatch-plugin-postdoc
```

`postdoc test` loads the plugin when the project has it installed. If you use your own Nightwatch configuration, add it there:

```js
module.exports = {
  plugins: ['nightwatch-plugin-postdoc']
};
```

## Page tests

Each file in `test/pages` describes one page of the site. The default export is a Nightwatch [page object](https://nightwatchjs.org/guide/concepts/page-object-model.html), and every other exported function is a test case:

```js
// test/pages/guide.js
export default {
  url: '/guide/index.html',

  elements: {
    content: '#content',
    sidebar: '#left-sidebar'
  },

  // Optional: adds an accessibility test of the page.
  a11y: {
    selector: 'body',
    config: {
      runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa']}
    }
  }
};

export function contentIsVisible({page, element, browser}) {
  element('@content').assert.visible();
}
```

For every page test, the plugin:

1. opens the page at its `url`, relative to the site's address
2. waits until PostDoc has finished rendering it, and skips the page's test cases if it doesn't
3. runs the accessibility test, if the page has `a11y` settings
4. runs the test cases on the same page, one after another

ES modules list their exports alphabetically, so that's the order test cases run in. A test case receives the page object as `page`, its element API as `element`, and `browser`. The default export can also have `before`, `after`, `beforeEach` and `afterEach` hooks. A file in a subfolder, such as `test/pages/api_reference/configuration.js`, is available as `browser.page.api_reference.configuration()`.

Tests outside the pages folder are ordinary Nightwatch tests, and the plugin leaves them alone.

### Accessibility settings

| Setting | Default | |
| --- | --- | --- |
| `enabled` | `true` | Set to `false` to skip the test. |
| `selector` | `body` | The part of the page to check. |
| `config` | | [aXe run options](https://www.deque.com/axe/core-documentation/api-documentation/#options-parameter), such as `runOnly` or `rules`. |
| `verbose` | `false` | Also lists the rules that passed. |

## The site under test

- With `postdoc test`, PostDoc builds the site and serves it, and the plugin opens pages there.
- When you run Nightwatch directly, the plugin starts the PostDoc dev server and stops it after the tests.

Either way, the site's address is in the `POSTDOC_BASE_URL` environment variable, and it's set as Nightwatch's `launch_url`.

## Settings

```js
module.exports = {
  test_settings: {
    default: {
      postdoc: {
        // The folder with the page tests. postdoc test passes <testsPath>/pages.
        pages_path: 'test/pages',

        // Set to false to start the site yourself and set launch_url.
        start_server: true,

        // How long to wait, in milliseconds, for PostDoc to render a page.
        ready_timeout: 10000
      }
    }
  }
};
```

## Commands

### waitForPostDocReady([timeout])

Waits until PostDoc has rendered the current page, for up to `timeout` milliseconds (the `ready_timeout` setting by default), and fails the test case if it hasn't. Use it after an action that moves to another page, which PostDoc does without a reload:

```js
browser
  .click('a[href$="/guide/index.html"]')
  .waitForPostDocReady();
```

### runA11yTests({page, a11y_config})

Checks the current page with aXe, using the [accessibility settings](#accessibility-settings) above. `page` is the page's name in the accessibility report, which is printed at the end of the run.

## License

MIT
