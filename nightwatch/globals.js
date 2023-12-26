const {spawn} = require('child_process');
const createProcess = require('../lib/createProcess.js');

const isWinPlatform = process.platform === 'win32';
let postdocProcess = null;
let postdocPid = null;

const endProcess = function () {
  if (!postdocPid) {
    return;
  }

  if (isWinPlatform) {
    spawn('taskkill', ['/pid', postdocPid, '/f', '/t']);

    return;
  }

  process.kill(postdocPid);
};

const isWorker = process.argv.includes('--test-worker');
const startServer = async function (settings = {}) {
  const start_server = settings.postdoc?.start_server ?? true;

  if (start_server) {
    const childProcess = await createProcess();
    postdocProcess = childProcess.postdocProcess;
    postdocPid = childProcess.postdocProcess.pid;

    console.log(`Postdoc dev server is running at ${childProcess.url} with pid: ${postdocPid}`);

    return postdocPid;
  }
};

module.exports = {
  async before(settings) {
    if (!settings.parallel_mode || settings.parallel_mode && !isWorker) {
      await startServer.call(this, settings);
    }
  },

  async after() {
    endProcess();
  }
};