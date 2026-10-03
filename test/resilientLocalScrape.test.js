import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildRunnerArgs,
  consumeStopRequest,
  parseArgs,
  shouldRestartRun,
  runResilientScrape,
} from '../scripts/resilientLocalScrape.js'

const supervisorScript = fileURLToPath(new URL('../scripts/resilientLocalScrape.js', import.meta.url))
const childFixture = fileURLToPath(new URL('./fixtures/resilientScrapeChild.js', import.meta.url))

test('resilient launcher parses a bounded live parallel run', () => {
  const options = parseArgs([
    '--run-dir', 'C:/repo/artifacts/run-logs/local-scrape-test',
    '--parallel',
    '--live',
    '--max-restarts', '8',
    '--restart-delay-seconds', '45',
  ])

  assert.equal(options.runDir, path.resolve('C:/repo/artifacts/run-logs/local-scrape-test'))
  assert.equal(options.parallel, true)
  assert.equal(options.dryRun, false)
  assert.equal(options.maxRestarts, 8)
  assert.equal(options.restartDelayMs, 45_000)
  assert.deepEqual(buildRunnerArgs(options), ['scraper-support/runner.js', '--parallel'])
})

test('resilient launcher restarts only incomplete unexpected exits', () => {
  const incomplete = { status: 'running', completedCount: 40, totalSources: 100 }
  const complete = { status: 'complete', completedCount: 100, totalSources: 100 }
  const intentionallyHalted = {
    status: 'interrupted',
    completedCount: 40,
    totalSources: 100,
    restartable: false,
  }

  assert.equal(shouldRestartRun({
    exitCode: 1,
    signal: null,
    stopRequested: false,
    restartCount: 1,
    maxRestarts: 5,
    checkpoint: incomplete,
  }), true)
  assert.equal(shouldRestartRun({
    exitCode: 1,
    signal: null,
    stopRequested: false,
    restartCount: 1,
    maxRestarts: 5,
    checkpoint: complete,
  }), false)
  assert.equal(shouldRestartRun({
    exitCode: 1,
    signal: null,
    stopRequested: true,
    restartCount: 1,
    maxRestarts: 5,
    checkpoint: incomplete,
  }), false)
  assert.equal(shouldRestartRun({
    exitCode: 1,
    signal: null,
    stopRequested: false,
    restartCount: 5,
    maxRestarts: 5,
    checkpoint: incomplete,
  }), false)
  assert.equal(shouldRestartRun({
    exitCode: 1,
    signal: null,
    stopRequested: false,
    restartCount: 1,
    maxRestarts: 5,
    checkpoint: intentionallyHalted,
  }), false)
})

test('resilient launcher consumes a durable graceful-stop request once', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jobverify-stop-request-'))
  const requestPath = path.join(directory, 'stop-request.json')

  try {
    fs.writeFileSync(requestPath, `\uFEFF${JSON.stringify({ signal: 'SIGINT' })}`)

    assert.deepEqual(consumeStopRequest(requestPath), { signal: 'SIGINT' })
    assert.equal(fs.existsSync(requestPath), false)
    assert.equal(consumeStopRequest(requestPath), null)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('resilient launcher restarts an incomplete child and finishes the same checkpoint', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jobverify-supervisor-'))
  const attemptFile = path.join(directory, 'attempt.txt')

  try {
    const result = spawnSync(process.execPath, [
      supervisorScript,
      '--run-dir', directory,
      '--dry-run',
      '--max-restarts', '2',
      '--restart-delay-seconds', '0',
      '--runner-script', childFixture,
    ], {
      cwd: path.dirname(supervisorScript),
      encoding: 'utf8',
      timeout: 10_000,
      env: {
        ...process.env,
        SCRAPER_ONLY: '__must_not_run_real_catalog__',
        RESILIENT_FIXTURE_ATTEMPT_FILE: attemptFile,
        JOB_CLASSIFICATION_MODE: 'off',
      },
    })

    assert.equal(result.error, undefined)
    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.equal(fs.readFileSync(attemptFile, 'utf8'), '2')
    const exit = JSON.parse(fs.readFileSync(path.join(directory, 'run-exit.json'), 'utf8'))
    assert.equal(exit.restartCount, 1)
    assert.equal(exit.checkpointStatus, 'complete')
    assert.match(fs.readFileSync(path.join(directory, 'pipeline.log'), 'utf8'), /restarting in 0s/i)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('resilient supervisor waits for Laya and retains its worker across runner retries', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-supervisor-test-'));
  const events = [];
  try {
    const result = await runResilientScrape(parseArgs(['--run-dir', directory, '--dry-run', '--runner-script', childFixture, '--restart-delay-seconds', '0']), {
      env: { ...process.env, RESILIENT_FIXTURE_ATTEMPT_FILE: path.join(directory, 'attempt.txt'), JOB_CLASSIFICATION_MODE: 'policy' },
      prepareLaya: async ({ env }) => {
        events.push('prepare');
        await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(fs.existsSync(path.join(directory, 'attempt.txt')), false);
        events.push('ready');
        return { env, stop: async () => { assert.equal(fs.readFileSync(path.join(directory, 'attempt.txt'), 'utf8'), '2'); events.push('stop'); } };
      },
    });
    assert.equal(result, 0);
    assert.deepEqual(events, ['prepare', 'ready', 'stop']);
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'run-metadata.json'))).environment.JOB_CLASSIFICATION_MODE, 'policy');
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('a failed Laya installation never starts the scraper child', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'laya-supervisor-test-'));
  try {
    await assert.rejects(runResilientScrape(parseArgs(['--run-dir', directory, '--dry-run', '--runner-script', childFixture]), {
      env: { ...process.env, RESILIENT_FIXTURE_ATTEMPT_FILE: path.join(directory, 'attempt.txt') },
      prepareLaya: async () => { throw new Error('installation failed'); },
    }), /installation failed/);
    assert.equal(fs.existsSync(path.join(directory, 'attempt.txt')), false);
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'run-exit.json'))).code, 1);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
