import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Solve today's biggest challenges in defense and transportation. | Cubic</title>
  </head>
  <body>
    <h1>Become a part of a global team that's shaping the future.</h1>
    <div>Cubic Transportation Systems</div>
    <a href="https://cubic.wd1.myworkdayjobs.com/en-US/cubic_global_careers">Global Opportunities</a>
  </body>
</html>
`

const workdayBoardHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <link rel="canonical" href="https://cubic.wd1.myworkdayjobs.com/cubic_global_careers" />
    <meta property="og:title" content="Global.Innovative.Trusted" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`

const programPlannerHtml = `
<!doctype html>
<html lang="en-US">
  <body>
    <h1>Program Planner</h1>
    <div>locations Hyderabad, Telangana</div>
    <div>Business Unit: Cubic Transportation Systems</div>
    <div>Job requisition id REQ_48774</div>
  </body>
</html>
`

const blockedApiPayload = {
  errorCode: 'HTTP_500',
  httpStatus: 500,
}

const loadModule = async () => {
  try {
    return await import('../cubictransportationsystems/script.js')
  } catch {
    assert.fail('Expected Cubic Transportation Systems scraper module at ../cubictransportationsystems/script.js')
  }
}

test('Cubic Transportation Systems helpers stay pinned to the verified careers shell, Workday board, and CTS job detail pages', async () => {
  const cubic = await loadModule()

  assert.equal(cubic.SOURCE, 'cubictransportationsystems')
  assert.equal(cubic.COMPANY, 'Cubic Transportation Systems')
  assert.equal(cubic.CAREERS_URL, 'https://www.cubic.com/careers')
  assert.equal(cubic.WORKDAY_BOARD_URL, 'https://cubic.wd1.myworkdayjobs.com/en-US/cubic_global_careers')
  assert.equal(cubic.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(cubic.hasOfficialWorkdayBoardSignal(workdayBoardHtml), true)
  assert.equal(cubic.hasVerifiedCtsJobDetailSignal(programPlannerHtml), true)
  assert.equal(cubic.isBlockedWorkdayApiPayload(blockedApiPayload), true)
})

test('Cubic Transportation Systems run validates the blocked enumeration contract and stays fail-closed', async () => {
  const cubic = await loadModule()
  const requestedUrls = []

  const jobs = await cubic.createCubicTransportationSystemsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === cubic.CAREERS_URL) return careersHtml
      if (url === cubic.WORKDAY_BOARD_URL) return workdayBoardHtml
      if (url === cubic.VERIFIED_JOB_DETAIL_URLS[0]) return programPlannerHtml
      throw new Error(`Unexpected Cubic URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, cubic.JOBS_API_URL)
      return blockedApiPayload
    },
  })

  assert.deepEqual(jobs, [])
  assert.deepEqual(requestedUrls, [
    cubic.CAREERS_URL,
    cubic.WORKDAY_BOARD_URL,
    cubic.VERIFIED_JOB_DETAIL_URLS[0],
    cubic.JOBS_API_URL,
  ])
})

test('Cubic Transportation Systems fails closed when the verified shell or job detail pages drift', async () => {
  const cubic = await loadModule()

  await assert.rejects(
    cubic.createCubicTransportationSystemsScraper().run({
      fetchText: async (url) => {
        if (url === cubic.CAREERS_URL) return '<html><body><h1>Careers</h1></body></html>'
        if (url === cubic.WORKDAY_BOARD_URL) return workdayBoardHtml
        return programPlannerHtml
      },
      fetchJson: async () => blockedApiPayload,
    }),
    /verified Cubic careers page/i,
  )

  await assert.rejects(
    cubic.createCubicTransportationSystemsScraper().run({
      fetchText: async (url) => {
        if (url === cubic.CAREERS_URL) return careersHtml
        if (url === cubic.WORKDAY_BOARD_URL) return workdayBoardHtml
        return '<html><body><h1>Program Planner</h1></body></html>'
      },
      fetchJson: async () => blockedApiPayload,
    }),
    /verified CTS job detail page/i,
  )
})
