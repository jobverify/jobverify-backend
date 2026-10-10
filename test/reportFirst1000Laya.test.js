import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { generateReport, wilsonInterval } from '../scripts/reportFirst1000Laya.js'

const setup = async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'laya-report-'))
  t.after(() => fs.rm(dir, { recursive: true, force: true }))
  await fs.mkdir(path.join(dir, 'scrape'))
  const write = (name, value) => fs.writeFile(path.join(dir, name), JSON.stringify(value))
  await write('manifest.json', { count: 2, sources: ['a', 'b'] })
  await write('status.json', { phase: 'running', queuedJobs: 2, pendingJobs: 0 })
  await write('run-exit.json', { complete: true })
  await write('scrape/run-state.json', { status: 'complete', completedCount: 2, totalSources: 2, catalogSources: ['a', 'b'], completed: { a: { result: { success: true } }, b: { result: { success: false } } } })
  const probabilities = { 'Full-time Fresher': .01, 'Full-time Experienced': .01, Intern: .97, Contract: .01 }
  const rows = [
    { sequence: 1, id: 'one', source: 'a', status: 'classified', jobType: 'Intern', probabilities,
      startedAt: '2026-10-05T12:00:00Z', completedAt: '2026-10-05T12:00:01Z', inferenceSeconds: 1,
      rulesComparison: { agreement: true, logicJobType: 'Intern' }, sourceArchive: { file: 'a.json', hash: 'hash', jobIndex: 0 },
      view: { windows: 1, sourceBodySha256: 'bodyhash' }, job: { title: '=unsafe CSV title' } },
    { sequence: 2, id: 'two', source: 'b', status: 'unusable_input', reason: 'missing_description',
      startedAt: '2026-10-05T12:00:02Z', completedAt: '2026-10-05T12:00:02Z', inferenceSeconds: 0, sourceArchive: { file: 'b.json', hash: 'bhash', jobIndex: 0 } },
  ]
  await fs.writeFile(path.join(dir, 'classified-jobs.jsonl'), rows.map(row => JSON.stringify(row)).join('\n') + '\n')
  await write('independent-source-review.json', { reviews: [
    { id: 'one', label: 'Full-time Experienced', sourceBodySha256: 'bodyhash', sourceArchive: { hash: 'hash', jobIndex: 0 } },
    { id: 'two', label: 'Contract', sourceArchive: { hash: 'bhash', jobIndex: 0 } },
  ] })
  return { dir, write }
}

test('report separates rules agreement, reviewed accuracy and unavailable predictions', async t => {
  const { dir } = await setup(t)
  const report = await generateReport(dir)
  assert.equal(report.complete, true)
  assert.equal(report.sourceFailures, 1)
  assert.deepEqual(report.sourceFailureCounts, { unknown: 1 })
  const sourceFailures = JSON.parse(await fs.readFile(path.join(dir, 'source-failures.json'), 'utf8'))
  assert.equal(sourceFailures.sourceScopeComplete, true)
  assert.equal(sourceFailures.pipelineComplete, true)
  assert.deepEqual(sourceFailures.failures.map(row => row.source), ['b'])
  assert.equal(report.counts.native_error, 0)
  assert.equal(report.rulesAgreementPercent, 100)
  assert.equal(report.independentReview.accuracyPercent, 0)
  assert.equal(report.independentReview.unavailablePredictions, 1)
  assert.equal(report.independentReview.awaitingClassification, 0)
  assert.equal(report.fifoViolations, 0)
  assert.match(await fs.readFile(path.join(dir, 'classification-comparison.csv'), 'utf8'), /'=unsafe CSV title/)
})

test('report combines frozen reviewer parts stored under jobs and rows', async t => {
  const { dir, write } = await setup(t)
  await write('independent-source-review.json', { reviews: [] })
  await write('independent-source-review-part-01.json', { frozen: true, jobs: [
    { id: 'one', label: 'Full-time Experienced', strictLabel: null, arrangementAssumptionUsed: true,
      sourceBodySha256: 'bodyhash', sourceArchive: { hash: 'hash', jobIndex: 0 } },
  ] })
  await write('independent-source-review-part-02.json', { frozen: true, rows: [
    { id: 'two', label: 'Contract', strictLabel: 'Contract', arrangementAssumptionUsed: false,
      sourceArchive: { hash: 'bhash', jobIndex: 0 } },
  ] })
  const report = await generateReport(dir)
  assert.equal(report.independentReview.labelled, 2)
  assert.equal(report.independentReview.scored, 1)
  assert.equal(report.independentReview.unavailablePredictions, 1)
  assert.equal(report.strictIndependentReview.reviewed, 2)
  assert.equal(report.strictIndependentReview.unavailablePredictions, 1)
})

test('strict source evidence is reported separately from full-time arrangement assumptions', async t => {
  const { dir, write } = await setup(t)
  await write('independent-source-review.json', { reviews: [
    { id: 'one', label: 'Full-time Experienced', strictLabel: null, arrangementAssumptionUsed: true,
      sourceBodySha256: 'bodyhash', sourceArchive: { hash: 'hash', jobIndex: 0 } },
    { id: 'two', label: 'Contract', strictLabel: 'Contract', arrangementAssumptionUsed: false,
      sourceArchive: { hash: 'bhash', jobIndex: 0 } },
  ] })
  const report = await generateReport(dir)
  assert.equal(report.independentReview.accuracyPercent, 0)
  assert.equal(report.strictIndependentReview.reviewed, 2)
  assert.equal(report.strictIndependentReview.ambiguous, 1)
  assert.equal(report.strictIndependentReview.unavailablePredictions, 1)
  assert.equal(report.strictIndependentReview.accuracyPercent, null)
  assert.equal(report.confidenceDiagnostics.belowPolicyThreshold, 0)
  assert.match(await fs.readFile(path.join(dir, 'analysis.md'), 'utf8'), /Strict employer-evidence review/)
})

test('terminal queue alone cannot prove the company scope completed', async t => {
  const { dir, write } = await setup(t)
  await write('scrape/run-state.json', { status: 'interrupted', completedCount: 1, totalSources: 2, catalogSources: ['a', 'b'] })
  assert.equal((await generateReport(dir)).complete, false)
})

test('review of a different archived description is rejected', async t => {
  const { dir, write } = await setup(t)
  await write('independent-source-review.json', { reviews: [{ id: 'one', label: 'Intern', sourceBodySha256: 'changed' }] })
  await assert.rejects(generateReport(dir), /exact classified source/)
  await assert.rejects(fs.access(path.join(dir, 'classification-comparison.csv.tmp')), { code: 'ENOENT' })
})

test('report discloses conditional taxonomy assumptions beside reviewed accuracy', async t => {
  const { dir, write } = await setup(t)
  await write('early-abb-source-review.json', {
    taxonomy: { arrangementAssumption: 'Full-time arrangement is provisional; strict explicit-arrangement review treats these labels as ambiguous.' },
    reviews: [{ id: 'one', label: 'Full-time Experienced', sourceArchive: { hash: 'hash', jobIndex: 0 } }],
  })
  // The early diagnostic and broad sample must not both claim the same job.
  await write('independent-source-review.json', { reviews: [] })
  const report = await generateReport(dir)
  assert.equal(report.independentReview.scored, 0)
  assert.equal(report.earlySingleCompanyReview.scored, 1)
  assert.match(await fs.readFile(path.join(dir, 'analysis.md'), 'utf8'), /Full-time arrangement is provisional; strict explicit-arrangement/)
})

test('overlapping report calls serialize publication without losing the completed report', async t => {
  const { dir } = await setup(t)
  const originalRename = fs.rename
  let release, reached, paused = false, secondFinished = false
  const pause = new Promise(resolve => { release = resolve })
  const publishing = new Promise(resolve => { reached = resolve })
  fs.rename = async (from, to) => {
    if (to === path.join(dir, 'classification-comparison.csv') && !paused) {
      paused = true; reached(); await pause
    }
    return originalRename(from, to)
  }
  t.after(() => { fs.rename = originalRename })
  const first = generateReport(dir)
  first.catch(() => {})
  await publishing
  const second = generateReport(dir).then(value => { secondFinished = true; return value })
  second.catch(() => {})
  try {
    await delay(100)
    assert.equal(secondFinished, false, 'second report must wait for the first publication')
  } finally { release(); await Promise.allSettled([first, second]) }
  assert.equal((await first).complete, true)
  assert.equal((await second).complete, true)
  assert.equal(JSON.parse(await fs.readFile(path.join(dir, 'analysis-summary.json'), 'utf8')).complete, true)
})

test('Wilson bounds expose uncertainty for small accuracy samples', () => {
  assert.equal(wilsonInterval(0, 0), null)
  const interval = wilsonInterval(0, 2)
  assert.ok(Math.abs(interval[0]) < 1e-10)
  assert.ok(interval[1] > 65 && interval[1] < 66)
})
