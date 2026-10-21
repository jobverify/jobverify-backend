import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { prepareOutreachRuntime } from '../outreach/runner.js';

test('model startup aborts an asset download at the shared worker deadline', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'jobverify-runtime-budget-'));
  const platform = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', { ...platform, value: 'linux' });
  t.after(async () => {
    Object.defineProperty(process, 'platform', platform);
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('jobverify-runtime-budget-'));
    await fs.rm(resolved, { recursive: true, force: true });
  });
  let calls = 0, aborted = false;
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    calls++;
    return new Promise((_resolve, reject) => {
      const guard = setTimeout(() => reject(new Error('Missed startup deadline')), 750);
      signal.addEventListener('abort', () => { aborted = true; clearTimeout(guard); reject(signal.reason); }, { once: true });
    });
  });
  await assert.rejects(prepareOutreachRuntime({ cacheRoot: directory, deadline: Date.now() + 100 }));
  assert.equal(aborted, true, 'the runtime must bound the actual download signal, rather than only checking afterwards');
  assert.equal(calls, 1, 'no extraction or model startup after an aborted download');
  assert.deepEqual(await fs.readdir(path.join(directory, '.cache/outreach-models')), []);
});
