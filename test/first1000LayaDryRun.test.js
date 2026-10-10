import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { jobIdentity, parseOptions, SerialModelProcess } from '../scripts/first1000LayaDryRun.js'

const protocolChild = async (t, code) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'first1000-protocol-'))
  const child = spawn(process.execPath, ['--input-type=module', '-e', code], {
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const protocol = new SerialModelProcess(child, path.join(directory, 'protocol.jsonl'))
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill()
    await protocol.exited
    await fs.rm(directory, { recursive: true, force: true })
  })
  return protocol
}

test('source posting identity remains stable when enrichment changes title, location, or tracking URL', () => {
  const raw = {
    sourceJobId: 'req-42', title: 'SDE II', location: 'Bengaluru, Karnataka, India',
    applyUrl: 'https://careers.example/jobs/42?campaign=raw',
  }
  const enriched = {
    ...raw, originalTitle: raw.title, title: 'Software Development Engineer II', location: 'Bangalore',
    applyUrl: 'https://careers.example/jobs/42?campaign=enriched',
  }
  assert.equal(jobIdentity('abb', raw), jobIdentity('abb', enriched))
  assert.notEqual(jobIdentity('abb', raw), jobIdentity('abb', { ...raw, sourceJobId: 'req-43' }))
  assert.notEqual(jobIdentity('abb', raw), jobIdentity('airbus', raw))
})

test('URL identity preserves semantic ref and source query fields', () => {
  for (const key of ['ref', 'source']) {
    const first = { title: 'Engineer', applyUrl: `https://careers.example/jobs?${key}=role-42` }
    const second = { title: 'Analyst', applyUrl: `https://careers.example/jobs?${key}=role-43` }
    assert.notEqual(jobIdentity('fixture', first), jobIdentity('fixture', second))
  }
})

test('URL identity preserves SPA vacancy fragments', () => {
  const first = { title: 'Engineer', applyUrl: 'https://careers.example/#/jobs/42' }
  const second = { title: 'Analyst', applyUrl: 'https://careers.example/#/jobs/43' }
  assert.notEqual(jobIdentity('fixture', first), jobIdentity('fixture', second))
})

test('shared mailto and general careers links retain distinct vacancy titles', () => {
  for (const applyUrl of ['mailto:jobs@example.test', 'https://careers.example/', 'https://careers.example/careers', 'https://careers.example/jobs']) {
    const first = { title: 'Engineer', applyUrl }
    const second = { title: 'Analyst', applyUrl }
    assert.notEqual(jobIdentity('fixture', first), jobIdentity('fixture', second))
    assert.equal(jobIdentity('fixture', first), jobIdentity('fixture', { ...first, originalTitle: first.title, title: 'Normalized Engineer' }))
  }
})

test('UTM tracking changes reuse the same dedicated vacancy identity', () => {
  const first = { title: 'Engineer', applyUrl: 'https://careers.example/jobs/42?utm_source=one&utm_campaign=old' }
  const second = { title: 'Updated Engineer title', applyUrl: 'https://careers.example/jobs/42?utm_source=two&utm_campaign=new' }
  assert.equal(jobIdentity('fixture', first), jobIdentity('fixture', second))
})

test('CLI scope defaults to exactly 1000 and rejects conflicting or invalid phase requests', () => {
  assert.equal(parseOptions([]).count, 1000)
  for (const count of ['0', '1001', '1.5', 'NaN']) assert.throws(() => parseOptions(['--count', count]))
  assert.throws(() => parseOptions(['--capture-only', '--classify-only']))
})

test('local evaluation uses configured scraper concurrency with the shared fallback', () => {
  assert.equal(parseOptions([], { SCRAPER_CONCURRENCY: '5' }).scraperConcurrency, 5)
  assert.equal(parseOptions([], {}).scraperConcurrency, 1)
  assert.equal(parseOptions([], { SCRAPER_CONCURRENCY: 'invalid' }).scraperConcurrency, 1)
})

test('actual child protocol waits for readiness and permits only one outstanding job', async t => {
  const protocol = await protocolChild(t, `
    import {createInterface} from 'node:readline';
    let ready = false;
    const lines = createInterface({input: process.stdin});
    setTimeout(() => {
      ready = true;
      console.log(JSON.stringify({type: 'ready', device: 'cpu', intraThreads: 1, interThreads: 1}));
    }, 60);
    lines.on('line', line => {
      if (!ready) process.exit(3);
      const request = JSON.parse(line);
      setTimeout(() => console.log(JSON.stringify({type: 'result', ...request, status: 'unusable_input'})), 60);
    });
    lines.on('close', () => process.exit(0));
  `)
  const request = protocol.request({ sequence: 1, id: 'one', source: 'abb' })
  await protocol.ready
  await new Promise(resolve => setImmediate(resolve))
  await assert.rejects(protocol.request({ sequence: 2, id: 'two', source: 'abb' }), /one model request/)
  const result = await request
  assert.equal(result.sequence, 1)
  assert.equal(result.status, 'unusable_input')
  protocol.stopped = true
  protocol.child.stdin.end()
  assert.deepEqual(await protocol.exited, { code: 0, signal: null })
})

test('actual child exit rejects an outstanding job instead of reporting a completed result', async t => {
  const protocol = await protocolChild(t, `
    import {createInterface} from 'node:readline';
    console.log(JSON.stringify({type: 'ready', device: 'cpu', intraThreads: 1, interThreads: 1}));
    createInterface({input: process.stdin}).on('line', () => process.exit(7));
  `)
  await assert.rejects(protocol.request({ sequence: 1, id: 'one', source: 'abb' }), /Model exited/)
  assert.equal((await protocol.exited).code, 7)
  assert.equal(protocol.outstanding, null)
})

test('malformed ready protocol rejects readiness without releasing a job', async t => {
  const protocol = await protocolChild(t, `
    console.log('this is not JSON');
    process.stdin.resume();
  `)
  await assert.rejects(protocol.request({ sequence: 1, id: 'one', source: 'abb' }), /Unexpected token/)
  assert.equal(protocol.readySeen, false)
  assert.equal(protocol.outstanding, null)
})
