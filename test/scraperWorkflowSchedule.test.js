import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const readScraperWorkflow = () => readFileSync(
  path.join(repoRoot, '.github/workflows/scraper.yml'),
  'utf8',
)

test('scraper workflow runs every day at 02:08 AM IST', () => {
  const workflow = readScraperWorkflow()

  assert.match(workflow, /cron:\s*['"]38 20 \* \* \*['"]/)
  assert.match(workflow, /Every day at 02:08 AM IST/)
})

test('scraper workflow leaves failure-abort handling disabled', () => {
  const workflow = readFileSync(
    path.join(repoRoot, '.github/workflows/scraper.yml'),
    'utf8',
  )

  assert.doesNotMatch(workflow, /SCRAPER_FAILURE_ABORT_THRESHOLD:/)
})

test('scraper workflow runs the scraper with system CA support enabled', () => {
  const workflow = readScraperWorkflow()

  assert.match(workflow, /NODE_OPTIONS:\s*['"]--use-system-ca['"]/)
})

test('scraper workflow bounds the job and per-source public enrichment budgets', () => {
  const workflow = readScraperWorkflow()

  assert.match(workflow, /\n\s+scrape:\s*\n(?:.*\n)*?\s+timeout-minutes:\s*360/)
  assert.match(workflow, /SCRAPER_SOURCE_LIFECYCLE_TIMEOUT_MS:\s*['"]1800000['"]/)
  assert.match(workflow, /PUBLIC_EXPERIENCE_FETCH_TIMEOUT_MS:\s*['"]15000['"]/)
  assert.match(workflow, /PDF_TEXT_EXTRACTION_TIMEOUT_MS:\s*['"]30000['"]/)
})

test('public runner requires Laya readiness and keeps resumable model checkpoints without the old inference budget', () => {
  const workflow = readScraperWorkflow()
  assert.doesNotMatch(workflow, /LAYA_TOTAL_BUDGET_SECONDS/)
  assert.doesNotMatch(workflow, /continue-on-error:.*enforce/)
  assert.match(workflow, /actions\/cache\/restore@v4/)
  assert.match(workflow, /actions\/cache\/save@v4/)
  assert.match(workflow, /classification-cache/)
  assert.match(workflow, /timeout --signal=TERM --kill-after=60s 310m/)
})
