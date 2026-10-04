import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { stopLayaWorker } from '../scripts/layaWorker.js';

test('an owned unresponsive worker is terminated through its exact child handle', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-worker-stop-'));
  const worker = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', windowsHide: true });
  const lease = { owned: true, pid: worker.pid, instanceId: 'owned-worker' };
  Object.defineProperty(lease, 'worker', { value: worker });
  const statePath = path.join(directory, 'worker.json');
  fs.writeFileSync(statePath, JSON.stringify(lease));
  try {
    const result = await stopLayaWorker(lease, { health: async () => null, statePath });
    assert.equal(result.stopped, true);
    assert.ok(worker.exitCode !== null || worker.signalCode !== null, 'cleanup must wait for the worker to exit');
    assert.equal(fs.existsSync(statePath), false);
  } finally {
    if (worker.exitCode === null && worker.signalCode === null) { const exited = once(worker, 'exit'); worker.kill(); await exited; }
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('owned cleanup leaves a replacement worker state intact', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-worker-stop-'));
  const worker = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', windowsHide: true });
  const lease = { owned: true, pid: worker.pid, instanceId: 'old-worker' };
  Object.defineProperty(lease, 'worker', { value: worker });
  const statePath = path.join(directory, 'worker.json');
  fs.writeFileSync(statePath, JSON.stringify({ instanceId: 'replacement' }));
  try {
    assert.equal((await stopLayaWorker(lease, { health: async () => ({ instanceId: 'replacement' }), statePath })).stopped, true);
    assert.equal(JSON.parse(fs.readFileSync(statePath)).instanceId, 'replacement');
  } finally {
    if (worker.exitCode === null && worker.signalCode === null) { const exited = once(worker, 'exit'); worker.kill(); await exited; }
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('persisted and borrowed leases cannot kill a process without matching health', async () => {
  const worker = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', windowsHide: true });
  try {
    assert.equal((await stopLayaWorker({ owned: true, instanceId: 'missing-process' }, { health: async () => null })).stopped, false);
    assert.equal((await stopLayaWorker({ owned: true, pid: worker.pid, instanceId: 'unverified' }, { health: async () => null })).stopped, false);
    assert.equal((await stopLayaWorker({ owned: false, pid: worker.pid, instanceId: 'borrowed', worker }, { health: async () => null })).stopped, false);
    assert.equal(worker.exitCode, null);
    assert.equal(worker.signalCode, null);
  } finally { const exited = once(worker, 'exit'); worker.kill(); await exited; }
});
