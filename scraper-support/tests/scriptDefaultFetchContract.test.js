import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const providersDir = path.resolve(currentDir, '../providers')

test('script catalog entries that destructure fetchText provide a production default fetcher', () => {
  const missingDefaults = getScraperCatalog()
    .filter((provider) => provider.adapter === 'script')
    .flatMap((provider) => {
      const scriptPath = path.resolve(providersDir, provider.modulePath)
      const code = readFileSync(scriptPath, 'utf8')
      const runLine = code
        .split(/\r?\n/)
        .find((line) => line.includes('export const run = async')) || ''

      if (!runLine.includes('{ fetchText')) return []
      if (/fetchText\s*=/.test(runLine)) return []

      return [`${provider.source}: ${path.relative(path.resolve(currentDir, '..', '..', 'scraper'), scriptPath)}`]
    })

  assert.deepEqual(missingDefaults, [])
})
