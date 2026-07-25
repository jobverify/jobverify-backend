import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Accelya | The World-leading Aviation Software Company</title>
  </head>
  <body>
    <h1>Careers</h1>
    <a href="https://accelya.wd103.myworkdayjobs.com/Careers">View all jobs</a>
    <blockquote>Raveena Khatri Social Media Manager Mumbai office</blockquote>
  </body>
</html>
`

const workdayApiFailurePayload = {
  errorCode: 'HTTP_500',
  errorCaseId: 'EF4887MRQ0DPAW',
  httpStatus: 500,
  message: '',
  messageParams: {},
}

const workdayApiBadRequestPayload = {
  errorCode: 'HTTP_400',
  errorCaseId: 'E64549MRS7VH0N',
  httpStatus: 400,
  message: '',
  messageParams: {},
}

const loadModule = async () => {
  try {
    return await import('../accelyasolutionsindialimited/script.js')
  } catch {
    assert.fail('Expected Accelya Solutions India Limited scraper module at ../accelyasolutionsindialimited/script.js')
  }
}

test('Accelya Solutions India Limited helpers stay pinned to the verified careers handoff and Workday API failure payload', async () => {
  const accelya = await loadModule()

  assert.equal(accelya.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(
    accelya.extractVerifiedWorkdayBoardUrl(careersHtml),
    'https://accelya.wd103.myworkdayjobs.com/Careers',
  )
  assert.equal(accelya.isVerifiedWorkdayApiFailure(workdayApiFailurePayload), true)
  assert.equal(accelya.isVerifiedWorkdayApiFailure(workdayApiBadRequestPayload), true)
})

test('Accelya Solutions India Limited run validates the verified Workday API failure and stays fail-closed', async () => {
  const accelya = await loadModule()
  const jobs = await accelya.createAccelyaSolutionsIndiaLimitedScraper().run({
    fetchText: async (url) => {
      assert.equal(url, accelya.CAREERS_URL)
      return careersHtml
    },
    fetchJson: async (url, body) => {
      assert.equal(url, accelya.JOBS_API_URL)
      assert.equal(
        body,
        JSON.stringify({
          appliedFacets: {
            Location_Country: ['c4f78be1a8f14da0ab49ce1162348a5e'],
          },
          limit: 20,
          offset: 0,
          searchText: '',
        }),
      )
      return workdayApiFailurePayload
    },
  })

  assert.deepEqual(jobs, [])
})

test('Accelya Solutions India Limited run treats live Workday HTTP 400 as the verified non-enumerable API state', async () => {
  const accelya = await loadModule()
  const jobs = await accelya.createAccelyaSolutionsIndiaLimitedScraper().run({
    fetchText: async (url) => {
      assert.equal(url, accelya.CAREERS_URL)
      return careersHtml
    },
    fetchJson: async (url) => {
      assert.equal(url, accelya.JOBS_API_URL)
      throw new Error(`HTTP 400 for ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
})

test('Accelya Solutions India Limited fails closed when the verified jobs API starts returning listings', async () => {
  const accelya = await loadModule()

  await assert.rejects(
    accelya.createAccelyaSolutionsIndiaLimitedScraper().run({
      fetchText: async () => careersHtml,
      fetchJson: async () => ({
        total: 1,
        jobPostings: [{ title: 'Engineer II - Software Development' }],
      }),
    }),
    /now returns public jobs api listings/i,
  )
})
