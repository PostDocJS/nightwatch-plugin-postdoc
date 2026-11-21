const assert = require('node:assert/strict');
const {chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} = require('node:fs');
const {tmpdir} = require('node:os');
const path = require('node:path');
const {test} = require('node:test');

const {startPostDocServer, stopPostDocServer} = require('../lib/postdocServer.js');

// A project whose `postdoc` binary runs the given script instead of PostDoc.
function createProject(script) {
  const projectPath = mkdtempSync(path.join(tmpdir(), 'postdoc-project-'));
  const binaryPath = path.join(projectPath, 'node_modules', '.bin', 'postdoc');

  mkdirSync(path.dirname(binaryPath), {recursive: true});
  writeFileSync(binaryPath, `#!/usr/bin/env node\n${script}`);
  chmodSync(binaryPath, 0o755);

  return projectPath;
}

test('resolves with the address the dev server prints', {skip: process.platform === 'win32'}, async (t) => {
  const projectPath = createProject(`
    console.log('Banner with a link: https://postdoc.dev');
    console.log('\\u001b[32mServer is listening on:\\n  - http://localhost:4321/\\u001b[39m');
    setInterval(() => {}, 1000);
  `);
  t.after(() => rmSync(projectPath, {recursive: true}));

  const server = await startPostDocServer({cwd: projectPath});

  assert.equal(server.url, 'http://localhost:4321/');
  stopPostDocServer(server);
});

test('rejects with the server output when the server stops', {skip: process.platform === 'win32'}, async (t) => {
  const projectPath = createProject(`
    console.error('Error: Port 3001 is already in use');
    process.exit(1);
  `);
  t.after(() => rmSync(projectPath, {recursive: true}));

  await assert.rejects(startPostDocServer({cwd: projectPath}), (error) => {
    assert.match(error.message, /stopped with exit code 1/);
    assert.match(error.message, /Port 3001 is already in use/);
    assert.ok(error.help.length > 0);

    return true;
  });
});
