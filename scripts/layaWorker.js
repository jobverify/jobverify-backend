import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { CLASSIFICATION_MODEL, POLICY_HASH, RUNTIME_HASH } from '../src/services/jobClassificationPolicy.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, '.cache/scraper-actions');
const stateFile = path.join(directory, 'laya-worker.json');
const endpoint = 'http://127.0.0.1:8765';
export const readLayaHealth = async () => {
  try {
    const response = await fetch(`${endpoint}/health`, { signal: AbortSignal.timeout(2000) });
    return response.ok ? await response.json() : null;
  } catch { return null; }
};
const writeStats = value => fs.writeFileSync(path.join(directory, 'classification-summary.json'), `${JSON.stringify(value, null, 2)}\n`);

const validateHealth = (status, mode) => {
  if (status?.ready !== true || status.identity?.modelRevision !== CLASSIFICATION_MODEL.revision || status.identity.runtimeVersion !== CLASSIFICATION_MODEL.runtimeVersion || status.identity.runtimeHash !== RUNTIME_HASH || status.identity.policyHash !== POLICY_HASH) throw new Error('Laya identity mismatch or worker not ready');
  if (mode === 'enforce' && !status.enforceAllowed) throw new Error('Cannot enforce: human evaluation gate has not passed');
};

const terminateWorker = async worker => {
  if (worker.exitCode !== null || worker.signalCode !== null) return;
  await new Promise((resolve, reject) => {
    const finish = error => {
      clearTimeout(timer);
      worker.off('exit', onExit);
      worker.off('error', onError);
      error ? reject(error) : resolve();
    };
    const onExit = () => finish();
    const onError = error => finish(error);
    const timer = setTimeout(() => finish(new Error('Laya worker did not exit after termination')), 10000);
    worker.once('exit', onExit);
    worker.once('error', onError);
    if (!worker.kill()) finish(new Error('Could not terminate the owned Laya worker'));
  });
};

export const startLayaWorker = async ({ env = process.env, signal, log = () => {} } = {}) => {
  signal?.throwIfAborted();
  const existing = await readLayaHealth();
  if (existing) {
    validateHealth(existing, env.JOB_CLASSIFICATION_MODE);
    log('Reusing the ready Laya worker.');
    return { owned: false, instanceId: existing.instanceId };
  }
  fs.mkdirSync(directory, { recursive: true });
  const instanceId = randomUUID();
  const logDescriptor = fs.openSync(path.join(directory, 'laya-worker.log'), 'w');
  const worker = spawn(env.LAYA_PYTHON || 'python', [path.join(root, 'classification/runtime.py')], {
    cwd: root, detached: true, windowsHide: true, stdio: ['ignore', logDescriptor, logDescriptor],
    env: { ...env, LAYA_INSTANCE_ID: instanceId, PYTHONUNBUFFERED: '1', HF_HOME: env.HF_HOME || path.join(root, '.cache/laya-model') },
  });
  fs.closeSync(logDescriptor);
  let startupError, exited = false;
  worker.on('error', error => { startupError = error; });
  worker.on('exit', () => { exited = true; });
  const deadline = Date.now() + 600000;
  let nextProgress = Date.now() + 15000;
  try {
    let status;
    while (Date.now() < deadline) {
      signal?.throwIfAborted();
      if (startupError) throw startupError;
      if (exited) throw new Error('Laya worker exited during startup; inspect laya-worker.log');
      status = await readLayaHealth();
      if (status?.instanceId === instanceId && status.ready) break;
      if (Date.now() >= nextProgress) { log('Waiting for Laya model download and warmup...'); nextProgress = Date.now() + 15000; }
      await delay(1000, undefined, { signal });
    }
    if (!status?.ready || status.instanceId !== instanceId) throw new Error('Laya startup exceeded ten minutes');
    signal?.throwIfAborted();
    validateHealth(status, env.JOB_CLASSIFICATION_MODE);
    fs.writeFileSync(stateFile, JSON.stringify({ pid: worker.pid, instanceId }));
    writeStats(status);
    worker.unref();
    log('Laya is ready.');
    const lease = { owned: true, pid: worker.pid, instanceId };
    Object.defineProperty(lease, 'worker', { value: worker });
    return lease;
  } catch (error) {
    if (!exited && worker.pid) worker.kill();
    throw error;
  }
};

export const stopLayaWorker = async (state, { health = readLayaHealth, statePath = stateFile } = {}) => {
  if (state?.owned) {
    const status = await health();
    const matchingHealth = status?.instanceId === state.instanceId;
    const ownedChild = state.worker && Number.isInteger(state.pid) && state.worker.pid === state.pid;
    if (ownedChild || matchingHealth) {
      // The in-memory child handle belongs to this supervisor even when health hangs.
      // Persisted CLI leases still require identity verification before using a PID.
      if (ownedChild) await terminateWorker(state.worker);
      else process.kill(state.pid);
      if (matchingHealth) writeStats(status);
      if (fs.existsSync(statePath) && JSON.parse(fs.readFileSync(statePath)).instanceId === state.instanceId) fs.unlinkSync(statePath);
      return { stopped: true, stats: matchingHealth ? status.stats : undefined };
    }
  }
  return { stopped: false };
};

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === 'start') {
      const controller = new AbortController();
      const abort = () => controller.abort(new Error('Laya startup interrupted'));
      process.once('SIGINT', abort);
      process.once('SIGTERM', abort);
      try { console.log(JSON.stringify({ ready: true, ...await startLayaWorker({ signal: controller.signal }), enforceAllowed: (await readLayaHealth())?.enforceAllowed })); }
      finally { process.off('SIGINT', abort); process.off('SIGTERM', abort); }
    } else if (process.argv[2] === 'stop') {
      if (fs.existsSync(stateFile)) console.log(JSON.stringify(await stopLayaWorker({ ...JSON.parse(fs.readFileSync(stateFile)), owned: true })));
    } else throw new Error('Usage: node scripts/layaWorker.js start|stop');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
