import assert from 'node:assert/strict'
import test from 'node:test'

const loadBajajModule = async () => {
  try {
    return await import('../../scraper/bajajfinservhealth/script.js')
  } catch {
    assert.fail('Expected Bajaj Finserv Health scraper module at ../../scraper/scraper/bajajfinservhealth/script.js')
  }
}

const samplePayload = {
  totalRecords: 0,
  response: [],
  messageCode: {
    code: 200,
    messages: 'success',
  },
  campusHiring: 0,
  solrSearch: false,
}

test('buildApiUrl keeps Bajaj Finserv Health on the public PeopleStrong jobs feed', async () => {
  const {
    DEFAULT_PAGE_SIZE,
    buildApiUrl,
    buildJobDetailApiUrl,
    buildJobDetailUrl,
  } = await loadBajajModule()

  assert.equal(
    buildApiUrl(),
    'https://bfhlcareers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=20',
  )
  assert.equal(
    buildApiUrl({ offset: 20, limit: 10 }),
    'https://bfhlcareers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=20&limit=10',
  )
  assert.equal(DEFAULT_PAGE_SIZE, 20)
  assert.equal(
    buildJobDetailUrl('REQ-1234'),
    'https://bfhlcareers.peoplestrong.com/job/detail/REQ-1234',
  )
  assert.equal(
    buildJobDetailApiUrl('REQ-1234'),
    'https://bfhlcareers.peoplestrong.com/api/cp/rest/altone/cp/job/REQ-1234/v2?part=overview&isReqId=true',
  )
})

test('extractSearchResults returns no jobs when the live Bajaj Finserv Health PeopleStrong feed is empty', async () => {
  const { extractSearchResults } = await loadBajajModule()
  const jobs = extractSearchResults(samplePayload)

  assert.deepEqual(jobs, [])
})

test('run posts the empty search body to Bajaj Finserv Health PeopleStrong and decorates shared runner fields', async () => {
  const {
    EMPTY_SEARCH_BODY,
    buildApiUrl,
    createBajajFinservHealthScraper,
  } = await loadBajajModule()
  const requests = []
  const scraper = createBajajFinservHealthScraper()

  const jobs = await scraper.run({
    fetchJson: async (url, options = {}) => {
      requests.push({ url, options })
      if (url === buildApiUrl()) return samplePayload
      throw new Error(`Unexpected Bajaj Finserv Health URL: ${url}`)
    },
  })

  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, buildApiUrl())
  assert.equal(requests[0].options.method, 'POST')
  assert.equal(requests[0].options.headers.Origin, 'https://bfhlcareers.peoplestrong.com')
  assert.equal(requests[0].options.headers.Referer, 'https://bfhlcareers.peoplestrong.com/')
  assert.equal(requests[0].options.body, JSON.stringify(EMPTY_SEARCH_BODY))
  assert.deepEqual(jobs, [])
})
