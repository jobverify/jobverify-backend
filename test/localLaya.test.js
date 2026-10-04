import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import * as bootstrap from '../scripts/localLaya.js';

test('cached CPU dependencies avoid reinstalling Python or packages', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-install-test-'));
  const python = path.join(directory, '.cache/laya-python/package/tools/python.exe');
  fs.mkdirSync(path.dirname(python), { recursive: true });
  fs.writeFileSync(python, 'fixture');
  fs.mkdirSync(path.join(directory, 'classification'));
  fs.copyFileSync(new URL('../classification/requirements.txt', import.meta.url), path.join(directory, 'classification/requirements.txt'));
  const commands = [];
  try {
    const env = await bootstrap.installLocalLaya({ backendDir: directory, platform: 'win32', env: {},
      run: async (program, args) => { commands.push([program, args]); return { stdout: 'ready' }; },
      download: () => assert.fail('cached Python must not download'),
    });
    assert.equal(env.LAYA_PYTHON, python);
    assert.equal(env.JOB_CLASSIFICATION_MODE, 'policy');
    assert.equal(env.USE_TF, '0');
    assert.equal(commands.length, 2);
    assert.ok(commands.every(([, args]) => args[0] === '-c'));
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('missing dependencies install CPU torch before pinned Laya requirements', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-install-test-'));
  const python = path.join(directory, '.cache/laya-python/package/tools/python.exe');
  fs.mkdirSync(path.dirname(python), { recursive: true });
  fs.writeFileSync(python, 'fixture');
  fs.mkdirSync(path.join(directory, 'classification'));
  fs.copyFileSync(new URL('../classification/requirements.txt', import.meta.url), path.join(directory, 'classification/requirements.txt'));
  const commands = [];
  let dependencyProbe = 0;
  try {
    await bootstrap.installLocalLaya({ backendDir: directory, platform: 'win32', env: {},
      run: async (program, args) => {
        commands.push(args);
        if (args[0] === '-c' && args[1].includes('importlib.metadata') && dependencyProbe++ === 0) throw new Error('dependencies missing');
        return { stdout: 'ready' };
      },
    });
    const pip = commands.filter(args => args[0] === '-m' && args[1] === 'pip');
    assert.equal(pip.length, 2);
    assert.ok(pip[0].includes('torch==2.8.0'));
    assert.ok(pip[0].includes('https://download.pytorch.org/whl/cpu'));
    assert.ok(pip[1].includes(path.join(directory, 'classification/requirements.txt')));
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('a first Windows run awaits the Python download and extraction before probing it', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-first-install-test-'));
  fs.mkdirSync(path.join(directory, 'classification'));
  fs.copyFileSync(new URL('../classification/requirements.txt', import.meta.url), path.join(directory, 'classification/requirements.txt'));
  const events = [];
  try {
    await bootstrap.installLocalLaya({ backendDir: directory, platform: 'win32', env: {},
      download: async (url, archive) => {
        assert.equal(url, 'https://api.nuget.org/v3-flatcontainer/python/3.12.10/python.3.12.10.nupkg');
        await new Promise(resolve => setTimeout(resolve, 20));
        fs.writeFileSync(archive, 'fixture archive');
        events.push('downloaded');
      },
      run: async (program, args, options) => {
        if (program === 'powershell.exe') {
          assert.equal(fs.existsSync(options.env.LAYA_BOOTSTRAP_ARCHIVE), true);
          const python = path.join(options.env.LAYA_BOOTSTRAP_DESTINATION, 'tools/python.exe');
          fs.mkdirSync(path.dirname(python), { recursive: true });
          fs.writeFileSync(python, 'fixture');
          events.push('extracted');
        } else { assert.equal(fs.existsSync(program), true); events.push('probe'); }
        return { stdout: 'ready' };
      },
    });
    assert.deepEqual(events, ['downloaded', 'extracted', 'probe', 'probe']);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('an interrupted startup never reaches model readiness', async () => {
  const controller = new AbortController();
  await assert.rejects(bootstrap.prepareLocalLaya({ env: {}, signal: controller.signal, log: () => {},
    install: async ({ env }) => { controller.abort(new Error('user stopped')); return env; },
    start: () => assert.fail('aborted installation cannot start a worker'),
  }), /user stopped/);
});

test('installation completes before worker startup and readiness precedes return', async () => {
  const events = [];
  const prepared = await bootstrap.prepareLocalLaya({ env: {}, log: () => {},
    install: async ({ env }) => { events.push('install'); return { ...env, JOB_CLASSIFICATION_MODE: 'policy', LAYA_PYTHON: 'cached-python' }; },
    start: async ({ env }) => { assert.equal(env.LAYA_PYTHON, 'cached-python'); events.push('ready'); return { owned: true, instanceId: 'ours' }; },
    stop: async lease => { assert.equal(lease.instanceId, 'ours'); events.push('stop'); return { stopped: true }; },
  });
  assert.deepEqual(events, ['install', 'ready']);
  assert.equal(prepared.env.JOB_CLASSIFICATION_MODE, 'policy');
  await prepared.stop();
  await prepared.stop();
  assert.deepEqual(events, ['install', 'ready', 'stop']);
});

test('failed worker cleanup is reported and can be retried', async () => {
  let attempts = 0;
  const logs = [];
  const prepared = await bootstrap.prepareLocalLaya({ env: {}, log: value => logs.push(value),
    install: async () => ({ JOB_CLASSIFICATION_MODE: 'policy' }),
    start: async () => ({ owned: true, instanceId: 'ours' }),
    stop: async () => ({ stopped: ++attempts > 1 }),
  });
  await assert.rejects(prepared.stop(), /could not stop/i);
  assert.ok(logs.every(value => !value.startsWith('Stopped')));
  await prepared.stop();
  assert.equal(attempts, 2);
});

test('a partial cached Python runtime is repaired before dependencies are used', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-repair-test-'));
  const python = path.join(directory, '.cache/laya-python/package/tools/python.exe');
  fs.mkdirSync(path.dirname(python), { recursive: true });
  fs.writeFileSync(python, 'partial');
  fs.mkdirSync(path.join(directory, 'classification'));
  fs.copyFileSync(new URL('../classification/requirements.txt', import.meta.url), path.join(directory, 'classification/requirements.txt'));
  try {
    const env = await bootstrap.installLocalLaya({ backendDir: directory, platform: 'win32', env: {},
      download: async (url, archive) => fs.writeFileSync(archive, 'fixture archive'),
      run: async (program, args, options) => {
        if (program === 'powershell.exe') {
          const staged = path.join(options.env.LAYA_BOOTSTRAP_DESTINATION, 'tools/python.exe');
          fs.mkdirSync(path.dirname(staged), { recursive: true });
          fs.writeFileSync(staged, 'complete');
        } else if (fs.readFileSync(program, 'utf8') === 'partial') throw new Error('missing Python runtime files');
        return { stdout: 'ready' };
      },
    });
    assert.equal(env.LAYA_PYTHON, python);
    assert.equal(fs.readFileSync(python, 'utf8'), 'complete');
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('failed Python extraction never publishes a partial interpreter', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-extract-test-'));
  try {
    await assert.rejects(bootstrap.installLocalLaya({ backendDir: directory, platform: 'win32', env: {},
      download: async (url, archive) => fs.writeFileSync(archive, 'fixture archive'),
      run: async (program, args, options) => {
        const partial = path.join(options.env.LAYA_BOOTSTRAP_DESTINATION, 'tools/python.exe');
        fs.mkdirSync(path.dirname(partial), { recursive: true });
        fs.writeFileSync(partial, 'partial');
        throw new Error('extraction interrupted');
      },
    }), /extraction interrupted/);
    assert.equal(fs.existsSync(path.join(directory, '.cache/laya-python/package/tools/python.exe')), false);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('installation or readiness failure prevents successful preparation', async () => {
  await assert.rejects(bootstrap.prepareLocalLaya({ env: {}, log: () => {},
    install: async () => { throw new Error('pip failed'); }, start: () => assert.fail('model cannot start'),
  }), /pip failed/);
  await assert.rejects(bootstrap.prepareLocalLaya({ env: {}, log: () => {},
    install: async () => ({ JOB_CLASSIFICATION_MODE: 'policy' }), start: async () => { throw new Error('not ready'); },
  }), /not ready/);
});

test('explicit off mode skips setup and borrowed workers are never stopped', async () => {
  const disabled = await bootstrap.prepareLocalLaya({ env: { JOB_CLASSIFICATION_MODE: 'off' }, log: () => {},
    install: () => assert.fail('off must not install'), start: () => assert.fail('off must not start'),
  });
  await disabled.stop();
  const borrowed = await bootstrap.prepareLocalLaya({ env: {}, log: () => {},
    install: async () => ({ JOB_CLASSIFICATION_MODE: 'policy' }), start: async () => ({ owned: false }),
    stop: () => assert.fail('borrowed worker must stay running'),
  });
  await borrowed.stop();
});
