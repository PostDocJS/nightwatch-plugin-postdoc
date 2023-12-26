const { spawn } = require('child_process');
const path = require('path');

function createProcess() {
  return new Promise((resolve, reject) => {
    const isWinPlatform = process.platform === 'win32';
    const postdocProcess = spawn(
      path.resolve(`node_modules/.bin/postdoc${isWinPlatform ? '.cmd' : ''}`),
      ['run'],
      {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    let stdoutData = '';

    postdocProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();

      const urlMatch = stdoutData.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        postdocProcess.stdout.removeAllListeners('data');
        postdocProcess.stderr.removeAllListeners('data');
        resolve({postdocProcess, url: urlMatch[0]});
      }
    });

    postdocProcess.stderr.on('data', (data) => {
      const message = data.toString()

      if (message.startsWith('Debugger listening on') || message.startsWith('Debugger attached')) {
        return;
      }

      postdocProcess.stdout.removeAllListeners('data');
      postdocProcess.stderr.removeAllListeners('data');
      console.log('stderr: ' + data.toString());
      reject(new Error(message));
    });

    postdocProcess.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`PostDoc process exited with code ${code}`));
      }
    });
  });
}

module.exports = createProcess;
