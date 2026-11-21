const {spawn} = require('node:child_process');
const path = require('node:path');

const isWindows = process.platform === 'win32';
// eslint-disable-next-line no-control-regex
const ANSI_CODES_RE = /\u001b\[[0-9;]*m/g;
const URL_RE = /https?:\/\/\S+/;

/**
 * Starts the project's PostDoc dev server and resolves with its process and the
 * address it serves the site at, once it is listening.
 */
function startPostDocServer({cwd = process.cwd(), timeout = 60000} = {}) {
  return new Promise((resolve, reject) => {
    const binaryPath = path.resolve(cwd, 'node_modules', '.bin', isWindows ? 'postdoc.cmd' : 'postdoc');
    const postdocProcess = spawn(binaryPath, ['run'], {
      cwd,
      env: {...process.env, NO_COLOR: '1'},
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: isWindows
    });

    let output = '';
    let isSettled = false;

    const settle = (callback) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        callback();
      }
    };

    const fail = (reason) => settle(() => {
      postdocProcess.kill();

      const error = new Error(`${reason}\n\n${output.trim()}`);
      error.help = [
        'If a PostDoc dev server is already running on the same port, stop it first.',
        'Or run the tests with `postdoc test`, which builds and serves the site itself.'
      ];

      reject(error);
    });

    const timer = setTimeout(() => fail(`The PostDoc dev server didn't start within ${timeout / 1000} seconds.`), timeout);

    // The output is read for as long as the server runs, so its pipe never fills up,
    // but only kept until the server is listening.
    const collectOutput = (data) => {
      if (isSettled) {
        return;
      }

      output += data.toString().replace(ANSI_CODES_RE, '');

      // PostDoc prints the address after "Server is listening on".
      const listeningIndex = output.indexOf('listening on');
      const url = listeningIndex > -1 && URL_RE.exec(output.slice(listeningIndex))?.[0];

      if (url) {
        settle(() => resolve({process: postdocProcess, url}));
      }
    };

    postdocProcess.stdout.on('data', collectOutput);
    postdocProcess.stderr.on('data', collectOutput);
    postdocProcess.on('error', (error) => fail(`The PostDoc dev server couldn't be started: ${error.message}`));
    postdocProcess.on('exit', (code) => fail(`The PostDoc dev server stopped with exit code ${code}.`));
  });
}

function stopPostDocServer({process: postdocProcess}) {
  if (postdocProcess.exitCode !== null) {
    return;
  }

  if (isWindows) {
    spawn('taskkill', ['/pid', postdocProcess.pid, '/f', '/t']);
  } else {
    postdocProcess.kill();
  }
}

module.exports = {
  startPostDocServer,
  stopPostDocServer
};
