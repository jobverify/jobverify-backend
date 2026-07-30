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

test('scraper workflow runs daily at 11:11 PM IST', () => {
  const workflow = readScraperWorkflow()

  assert.match(workflow, /cron:\s*['"]41 17 \* \* \*['"]/)
  assert.match(workflow, /11:11 PM IST/)
})

test('scraper workflow does not abort the full batch after only a few source failures', () => {
  const workflow = readFileSync(
    path.join(repoRoot, '.github/workflows/scraper.yml'),
    'utf8',
  )

  assert.match(workflow, /SCRAPER_FAILURE_ABORT_THRESHOLD:\s*['"]1000['"]/)
})

test('scraper workflow runs the scraper with system CA support enabled', () => {
  const workflow = readScraperWorkflow()

  assert.match(workflow, /NODE_OPTIONS:\s*['"]--use-system-ca['"]/)
})
