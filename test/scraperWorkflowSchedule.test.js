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

test('scraper workflow runs on Monday through Friday at 02:08 AM IST', () => {
  const workflow = readScraperWorkflow()

  assert.match(workflow, /cron:\s*['"]38 20 \* \* 0,1,2,3,4['"]/)
  assert.match(workflow, /Monday to Friday at 02:08 AM IST/)
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
