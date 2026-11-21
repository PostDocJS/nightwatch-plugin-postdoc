const assert = require('node:assert/strict');
const {test} = require('node:test');

const RunA11yTestsCommand = require('../nightwatch/commands/runA11yTests.js');

// A command whose aXe run gives these results, and which records what it reports.
function createCommand(results, calls) {
  const command = new RunA11yTestsCommand();
  const api = {
    axeInject: () => api,
    axeRun: (selector, options, callback) => {
      calls.push(['axeRun', selector, options]);
      callback(results);

      return api;
    },
    assert: {ok: (value, message) => calls.push(['ok', value, message])},
    verify: {fail: (error) => calls.push(['fail', error.message])}
  };

  command.api = api;
  command.client = {
    reporter: {
      setAxeResults: () => {},
      printA11yReport: () => {}
    }
  };

  return command;
}

test('passes a page without violations with an assertion', async () => {
  const calls = [];
  await createCommand({passes: [{}, {}], violations: []}, calls).command({page: 'guide', a11y_config: {selector: 'main'}});

  assert.deepEqual(calls.at(0), ['axeRun', 'main', {runAssertions: false}]);
  assert.deepEqual(calls.at(-1), ['ok', true, 'No accessibility violations on guide (2 aXe rules passed)']);
});

test('fails a page with violations, naming the rules', async () => {
  const calls = [];
  await createCommand({passes: [], violations: [{id: 'image-alt'}, {id: 'label'}]}, calls).command({page: 'guide', a11y_config: {}});

  assert.equal(calls.some(([name]) => name === 'ok'), false);
  assert.match(calls.at(-1)[1], /^2 accessibility violation\(s\) on guide: image-alt, label\./);
});

test('leaves the assertions to aXe with runAssertions', async () => {
  const calls = [];
  await createCommand({passes: [{}], violations: []}, calls).command({page: 'guide', a11y_config: {runAssertions: true}});

  assert.equal(calls.some(([name]) => name === 'ok'), false);
});

test('does nothing when disabled', async () => {
  const calls = [];
  await createCommand({passes: [], violations: []}, calls).command({page: 'guide', a11y_config: {enabled: false}});

  assert.deepEqual(calls, []);
});
