import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { planPublishingGapRollout } from '../scripts/publishPublishingGapRepairs.js'

const fixtures = () => {
  const trials = Array.from({ length: 50 }, (_, i) => ({ source: `source${String(i).padStart(2, '0')}`, jobs: [{}] }))
  return { trials, validation: { environment: 'temporary-local-mongodb', passedSources: 50,
    rows: trials.map(t => ({ source: t.source, outcome: 'passed', visibleJobs: 1, idempotent: true,
      trialHash: createHash('sha256').update(JSON.stringify(t)).digest('hex') })) } }
}
test('rollout requires all 50 locally validated sources and splits into five batches of ten', () => {
  const plan = planPublishingGapRollout(fixtures())
  assert.equal(plan.batches.length, 5)
  assert.deepEqual(plan.batches[0], ['source00', 'source01', 'source02', 'source03', 'source04', 'source05', 'source06', 'source07', 'source08', 'source09'])
  assert.equal(plan.batches[4][9], 'source49')
  const input = fixtures()
  input.validation.rows[49].outcome = 'needs-investigation'
  assert.throws(() => planPublishingGapRollout(input), /validation/i)
})
test('a successful validation for a different source cannot authorize the rollout', () => {
  const input = fixtures()
  input.trials[49].source = 'unvalidated'
  assert.throws(() => planPublishingGapRollout(input), /validation/i)
  assert.throws(() => planPublishingGapRollout({ ...fixtures(), trials: fixtures().trials.slice(0, 49) }), /50/)
})

test('changing jobs after local validation invalidates rollout eligibility', () => {
  const input = fixtures()
  input.trials[0].jobs.push({ title: 'An untested replacement' })
  assert.throws(() => planPublishingGapRollout(input), /validation|changed/i)
})

test('later reviewed releases support a final partial batch without weakening validation', () => {
  const input = fixtures()
  input.trials = input.trials.slice(0, 13)
  input.validation.rows = input.validation.rows.slice(0, 13)
  input.validation.passedSources = 13
  const plan = planPublishingGapRollout({ ...input, expectedSources: 13 })
  assert.deepEqual(plan.batches.map(batch => batch.length), [10, 3])
  assert.equal(plan.sourceCount, 13)
  assert.throws(() => planPublishingGapRollout({ ...input, expectedSources: 14 }), /14|validation/i)
})
