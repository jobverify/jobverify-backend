import { spawn } from 'node:child_process';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startLayaWorker, stopLayaWorker } from './layaWorker.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const versionProbe = "import sys; assert sys.version_info[:2] == (3, 12), 'Laya requires Python 3.12'; print('Python 3.12 ready')";

export const runSetupCommand = (program, args, { cwd, env, signal, quiet = false, log = () => {}, timeoutMs = 900000 } = {}) => new Promise((resolve, reject) => {
  const combined = signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
  const child = spawn(program, args, { cwd, env, signal: combined, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout = (stdout + chunk).slice(-1048576); if (!quiet) log(String(chunk).trimEnd()); });
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-1048576); if (!quiet) log(String(chunk).trimEnd()); });
  let commandError;
  child.once('error', error => { commandError = error; });
  child.once('close', code => commandError ? reject(commandError) : code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${path.basename(program)} setup exited ${code}: ${stderr.trim().slice(-1500)}`)));
});

const downloadFile = async (url, target, { signal } = {}) => {
  const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(300000)]) : AbortSignal.timeout(300000) });
  if (!response.ok) throw new Error(`Python download returned HTTP ${response.status}`);
  let bytes = 0;
  const limit = new Transform({ transform(chunk, encoding, callback) {
      bytes += chunk.length;
      callback(bytes > 300000000 ? new Error('Python package exceeds the download limit') : null, chunk);
  } });
  await pipeline(Readable.fromWeb(response.body), limit, fs.createWriteStream(target), { signal });
};

export const installLocalLaya = async ({ backendDir = root, env = process.env, platform = process.platform, run = runSetupCommand,
  download = downloadFile, signal, log = () => {} } = {}) => {
  const prepared = { ...env, JOB_CLASSIFICATION_MODE: env.JOB_CLASSIFICATION_MODE || 'policy',
    PYTHONUTF8: '1', PYTHONUNBUFFERED: '1', USE_TF: '0', LAYA_CPU_THREADS: env.LAYA_CPU_THREADS || '2',
    HF_HOME: env.HF_HOME || path.join(backendDir, '.cache/laya-model') };
  const execute = (program, args, options = {}) => run(program, args, { cwd: backendDir, env: prepared, signal, log, ...options });
  let python = prepared.LAYA_PYTHON;
  let versionChecked = false;
  if (platform === 'win32' && !python) {
    python = path.join(backendDir, '.cache/laya-python/package/tools/python.exe');
    if (fs.existsSync(python)) {
      try { await execute(python, ['-c', versionProbe], { quiet: true }); versionChecked = true; }
      catch { signal?.throwIfAborted(); log('Repairing the incomplete cached Python runtime...'); }
    }
    if (!versionChecked) {
      log('Installing portable Python 3.12.10 for Laya...');
      const cache = path.resolve(backendDir, '.cache/laya-python');
      fs.mkdirSync(cache, { recursive: true });
      const staging = fs.mkdtempSync(path.join(cache, 'python-install-'));
      if (!path.resolve(staging).startsWith(cache + path.sep)) throw new Error('Invalid Python staging destination');
      const archive = path.join(staging, 'python-3.12.10.zip');
      const stagedPackage = path.join(staging, 'package');
      try {
        await download('https://api.nuget.org/v3-flatcontainer/python/3.12.10/python.3.12.10.nupkg', archive, { signal });
        await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
          'Expand-Archive -LiteralPath $env:LAYA_BOOTSTRAP_ARCHIVE -DestinationPath $env:LAYA_BOOTSTRAP_DESTINATION -Force'],
        { env: { ...prepared, LAYA_BOOTSTRAP_ARCHIVE: archive, LAYA_BOOTSTRAP_DESTINATION: stagedPackage } });
        await execute(path.join(stagedPackage, 'tools/python.exe'), ['-c', versionProbe], { quiet: true });
        signal?.throwIfAborted();
        const destination = path.resolve(cache, 'package');
        if (!destination.startsWith(path.resolve(cache) + path.sep)) throw new Error('Invalid Python cache destination');
        fs.rmSync(destination, { recursive: true, force: true });
        fs.renameSync(stagedPackage, destination);
        versionChecked = true;
      } finally { fs.rmSync(staging, { recursive: true, force: true }); }
    }
  }
  python ||= 'python3.12';
  if (!versionChecked) await execute(python, ['-c', versionProbe], { quiet: true });
  // Never install packages into an explicitly configured system interpreter.
  const cacheRoot = path.resolve(backendDir, '.cache') + path.sep;
  if (!path.resolve(python).startsWith(cacheRoot)) {
    const environment = path.join(backendDir, '.cache/laya-venv');
    const localPython = path.join(environment, platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    if (!fs.existsSync(localPython)) await execute(python, ['-m', 'venv', environment]);
    python = localPython;
  }
  prepared.LAYA_PYTHON = python;
  const requirements = path.join(backendDir, 'classification/requirements.txt');
  const versions = Object.fromEntries(fs.readFileSync(requirements, 'utf8').split(/\r?\n/).map(line => line.match(/^([\w-]+)==([^\s#]+)$/)).filter(Boolean).map(match => [match[1], match[2]]));
  const dependencyProbe = `import importlib.metadata as m, torch; expected=${JSON.stringify(versions)}; assert m.version('torch').split('+')[0]=='2.8.0' and torch.version.cuda is None; assert all(m.version(k)==v for k,v in expected.items()); print('CPU Laya dependencies ready')`;
  try { await execute(python, ['-c', dependencyProbe], { quiet: true }); }
  catch (error) {
    signal?.throwIfAborted();
    log('Installing CPU torch and pinned Laya dependencies...');
    await execute(python, ['-m', 'ensurepip', '--upgrade']);
    await execute(python, ['-m', 'pip', 'install', '--disable-pip-version-check', 'torch==2.8.0', '--index-url', 'https://download.pytorch.org/whl/cpu']);
    await execute(python, ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', requirements]);
    await execute(python, ['-c', dependencyProbe], { quiet: true });
  }
  log('Python and CPU Laya dependencies are ready.');
  return prepared;
};

export const prepareLocalLaya = async ({ backendDir = root, env = process.env, signal, log = () => {},
  install = installLocalLaya, start = startLayaWorker, stop = stopLayaWorker } = {}) => {
  if (env.JOB_CLASSIFICATION_MODE === 'off') return { env, stop: async () => {} };
  const mode = env.JOB_CLASSIFICATION_MODE || 'policy';
  if (!['policy', 'shadow', 'enforce'].includes(mode)) throw new Error('Invalid local classification mode');
  if (env.LAYA_ENDPOINT && env.LAYA_ENDPOINT !== 'http://127.0.0.1:8765') throw new Error('Local Laya bootstrap requires http://127.0.0.1:8765');
  const prepared = await install({ backendDir, env: { ...env, JOB_CLASSIFICATION_MODE: mode }, signal, log });
  signal?.throwIfAborted();
  log('Starting and warming Laya before the scraper...');
  const lease = await start({ env: prepared, signal, log });
  let stopped = false;
  return { env: prepared, lease, stop: async () => {
    if (stopped || !lease.owned) return;
    const result = await stop(lease);
    if (!result?.stopped) throw new Error('Could not stop this run\'s Laya worker');
    stopped = true;
    log('Stopped this run\'s Laya worker.');
  } };
};
