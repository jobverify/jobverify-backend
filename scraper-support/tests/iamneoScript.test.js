import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(currentDir, 'fixtures', 'iamneo')

const loadFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const careersShellHtml = loadFixture('careers-shell.html')
const careersWithFirstPartyJobRecordHtml = loadFixture('careers-with-first-party-job-record.html')

const loadIamneoModule = async () => {
  try {
    return await import('../../scraper/iamneo/script.js')
  } catch {
    assert.fail('Expected iamneo scraper module at ../../scraper/iamneo/script.js')
  }
}

test('iamneo validates the verified first-party careers shell and external Keka handoff', async () => {
  const iamneo = await loadIamneoModule()

  assert.equal(iamneo.SOURCE, 'iamneo')
  assert.equal(iamneo.COMPANY, 'iamneo')
  assert.equal(iamneo.CAREERS_URL, 'https://iamneo.ai/careers/')
  assert.equal(iamneo.EXTERNAL_HANDOFF_URL, 'https://iamneo.keka.com/careers')
  assert.equal(iamneo.hasOfficialCareersSignal(careersShellHtml), true)
  assert.equal(iamneo.extractExternalHandoffUrl(careersShellHtml), iamneo.EXTERNAL_HANDOFF_URL)
  assert.deepEqual(iamneo.extractFirstPartyJobRecordUrls(careersShellHtml), [])
})

test('iamneo returns no jobs while the verified first-party careers page only exposes the external Keka handoff', async () => {
  const iamneo = await loadIamneoModule()
  const requestedUrls = []

  const jobs = await iamneo.createIamneoScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === iamneo.CAREERS_URL) {
        return careersShellHtml
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [iamneo.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('iamneo fails closed when the first-party careers handoff changes or first-party job records appear', async () => {
  const iamneo = await loadIamneoModule()

  await assert.rejects(
    iamneo.createIamneoScraper().run({
      fetchText: async () => careersShellHtml.replace(
        'https://iamneo.keka.com/careers',
        'https://iamneo.ai/jobs',
      ),
    }),
    /verified first-party careers shell/i,
  )

  await assert.rejects(
    iamneo.createIamneoScraper().run({
      fetchText: async () => careersWithFirstPartyJobRecordHtml,
    }),
    /first-party careers page now exposes public job records/i,
  )
})
