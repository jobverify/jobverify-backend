import assert from 'node:assert/strict'
import test from 'node:test'

const loadCentilyticsModule = async () => {
  try {
    return await import('../../scraper/centilytics/script.js')
  } catch {
    assert.fail('Expected Centilytics scraper module at ../../scraper/scraper/centilytics/script.js')
  }
}

const samplePayload = {
  code: 'success',
  data: [],
}

test('buildApiUrl keeps Centilytics on the first-party public Zoho Recruit feed', async () => {
  const { API_URL, buildApiUrl } = await loadCentilyticsModule()

  assert.equal(buildApiUrl(), API_URL)
  assert.equal(
    API_URL,
    'https://jobs.centilytics.com/recruit/v2/public/Job_Openings?source=CareerSite&pagename=Careers',
  )
})

test('extractSearchResults returns no jobs when the live Centilytics public Zoho Recruit feed is empty', async () => {
  const { extractSearchResults } = await loadCentilyticsModule()
  const jobs = extractSearchResults(samplePayload)

  assert.deepEqual(jobs, [])
})

test('run fetches Centilytics public job openings and decorates shared runner fields', async () => {
  const { API_URL, createCentilyticsScraper } = await loadCentilyticsModule()
  const requests = []
  const scraper = createCentilyticsScraper()

  const jobs = await scraper.run({
    fetchJson: async (url) => {
      requests.push(url)
      if (url === API_URL) return samplePayload
      throw new Error(`Unexpected Centilytics URL: ${url}`)
    },
  })

  assert.deepEqual(requests, [API_URL])
  assert.deepEqual(jobs, [])
})
