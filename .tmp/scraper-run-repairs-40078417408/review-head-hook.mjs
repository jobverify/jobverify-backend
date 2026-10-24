import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { registerHooks, syncBuiltinESMExports } from 'node:module'

const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)))
const baseline = process.env.REVIEW_BASELINE === '1'
const owned = new Set([
  '.github/workflows/scraper.yml',
  'scraper-support/runner.js',
  'scraper-support/finalSummaryFormatter.js',
  'scraper-support/utils/saveToDB.js',
  'scraper-support/utils/scraperRunSummary.js',
  'scraper-support/utils/runCheckpoint.js',
  'scraper-support/utils/scraperPersistence.js',
  'scraper-support/utils/fetch.js',
  'scraper-support/phenom/engine.js',
  'src/models/Job.js', 'src/models/ScraperRun.js',
  'src/services/scraperMaintenance.js', 'scripts/purgeRetiredCompanyJobs.js',
  'scraper/nuro/script.js', 'scraper/renewbuy/script.js', 'scraper/waymo/script.js',
  'scraper/biorad.workday/script.js', 'scraper/boloform/script.js',
  'scraper/cargill.workday/nativeRun.js', 'scraper/colgatepalmolive.workday/nativeRun.js',
  'scraper/lidolearning/script.js', 'scraper/purplle/script.js', 'scraper/supergrad/script.js',
  'scraper/aviatrix/script.js', 'scraper/graphcore/script.js', 'scraper/knolskape/script.js',
  'scraper/okinawaautotech/script.js', 'scraper/reviewdale/script.js',
  'scraper/simpleenergy/script.js', 'scraper/springboard/script.js', 'scraper/tricentis.workday/script.js',
])
const cache = new Map()
const relative = value => {
  if (value instanceof URL) value = fileURLToPath(value)
  if (typeof value !== 'string') return null
  return path.relative(root, path.resolve(value)).replaceAll('\\', '/')
}
const head = file => {
  const key = relative(file)
  if (!baseline || !owned.has(key)) return null
  if (!cache.has(key)) {
    let text = execFileSync('git', ['show', 'HEAD:' + key], { cwd: root, encoding: 'utf8', maxBuffer: 20_000_000 })
    // Preserve the pre-existing local retirement of Kissht in this comparison.
    if (key === 'scraper-support/utils/saveToDB.js') {
      text = text.replace(/  \/\/ Kissht previously keyed identities[\s\S]*?\? job\.fingerprintLocation : getPrimaryStoredLocation\(job\)/,
        '  const primaryLocation = getPrimaryStoredLocation(job)')
        .replace(/^.*normalizedJob\.source==='kissht'.*\r?\n/gm, '')
    }
    cache.set(key, Buffer.from(text))
  }
  return cache.get(key)
}
const originalRead = fs.readFileSync
fs.readFileSync = function(file, options) {
  const bytes = head(file)
  if (bytes === null) return originalRead.apply(this, arguments)
  const encoding = typeof options === 'string' ? options : options?.encoding
  return encoding ? bytes.toString(encoding) : Buffer.from(bytes)
}
const originalAsyncRead = fsp.readFile
fsp.readFile = async function(file, options) {
  const bytes = head(file)
  if (bytes === null) return originalAsyncRead.apply(this, arguments)
  const encoding = typeof options === 'string' ? options : options?.encoding
  return encoding ? bytes.toString(encoding) : Buffer.from(bytes)
}
syncBuiltinESMExports()
registerHooks({ load(url, context, nextLoad) {
  if (url.startsWith('file:')) {
    const bytes = head(fileURLToPath(new URL(url)))
    if (bytes !== null && url.split('?')[0].endsWith('.js')) {
      return { format: 'module', source: bytes.toString('utf8'), shortCircuit: true }
    }
  }
  return nextLoad(url, context)
} })
globalThis.fetch = async () => { throw Object.assign(new Error('REVIEW_OFFLINE_NETWORK_FORBIDDEN'), { abortRetries: true }) }
process.env.MONGOMS_RUNTIME_DOWNLOAD = 'false'
