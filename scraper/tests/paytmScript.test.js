import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Online recharge | Easy mobile recharge for prepaid and postpaid bill @Paytm.com</title>
  </head>
  <body>
    <main>
      <h1>Career at Paytm</h1>
      <p>Join us and become a part of India's mobile payment revolution.</p>
      <a href="https://jobs.lever.co/paytm">Apply Now</a>
      <a href="https://jobs.lever.co/paytm">View All Roles</a>
    </main>
  </body>
</html>
`

const officialLeverBoardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Paytm</title>
    <meta property="og:description" content="Job openings at Paytm" />
    <meta property="og:url" content="https://jobs.lever.co/paytm" />
  </head>
  <body>
    <img alt="Paytm logo" src="https://jobs.lever.co/paytm/logo.svg" />
    <section>Location type</section>
    <section>Location</section>
    <section>Team</section>
    <section>Work type</section>
    <a href="https://jobs.lever.co/paytm/paytm-001">Apply</a>
  </body>
</html>
`

const sampleLeverJobs = [
  {
    id: '8182f4b5-4dcb-4d3d-87fc-93a0d8730d3d',
    text: 'Accounts Payable Specialist',
    hostedUrl: 'https://jobs.lever.co/paytm/8182f4b5-4dcb-4d3d-87fc-93a0d8730d3d',
    applyUrl: 'https://jobs.lever.co/paytm/8182f4b5-4dcb-4d3d-87fc-93a0d8730d3d/apply',
    createdAt: new Date('2026-07-16T08:00:00.000Z').getTime(),
    country: 'IN',
    categories: {
      location: 'Noida, Uttar Pradesh',
      team: 'Accounting',
      commitment: 'Full-time Employment',
      allLocations: ['Noida, Uttar Pradesh'],
    },
    workplaceType: 'onsite',
    descriptionPlain: 'Own vendor invoices and payment cycles.',
  },
  {
    id: 'dubai-role',
    text: 'Account Executive - AI Agentic Enterprise Sales (Dubai)',
    hostedUrl: 'https://jobs.lever.co/paytm/dubai-role',
    applyUrl: 'https://jobs.lever.co/paytm/dubai-role/apply',
    createdAt: new Date('2026-07-16T09:00:00.000Z').getTime(),
    country: 'AE',
    categories: {
      location: 'Dubai',
      team: 'Inference and Agentic AI',
      commitment: 'Full-time Employment',
      allLocations: ['Dubai'],
    },
    workplaceType: 'onsite',
    descriptionPlain: 'Ignore this non-India role.',
  },
]

const loadPaytmModule = async () => {
  try {
    return await import('../paytm/script.js')
  } catch {
    assert.fail('Expected Paytm scraper module at ../paytm/script.js')
  }
}

test('Paytm scraper constants stay pinned to the verified first-party careers page and public Lever board', async () => {
  const paytm = await loadPaytmModule()

  assert.equal(paytm.SOURCE, 'paytm')
  assert.equal(paytm.COMPANY, 'Paytm')
  assert.equal(paytm.HOMEPAGE_URL, 'https://paytm.com/')
  assert.equal(paytm.CAREERS_URL, 'https://paytm.com/careers')
  assert.equal(paytm.LEVER_BOARD_URL, 'https://jobs.lever.co/paytm')
  assert.equal(paytm.LEVER_API_URL, 'https://api.lever.co/v0/postings/paytm?mode=json')
  assert.equal(paytm.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(paytm.extractLeverBoardUrl(officialCareersHtml), 'https://jobs.lever.co/paytm')
  assert.equal(paytm.hasOfficialLeverBoardSignal(officialLeverBoardHtml), true)
})

test('Paytm extracts only India roles from the verified Lever postings payload shape', async () => {
  const paytm = await loadPaytmModule()
  const jobs = paytm.extractLeverJobs(sampleLeverJobs)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Accounts Payable Specialist',
    company: 'Paytm',
    department: 'Accounting',
    location: 'Noida, Uttar Pradesh',
    city: 'Noida',
    country: 'India',
    jobId: '8182f4b5-4dcb-4d3d-87fc-93a0d8730d3d',
    requisitionId: '8182f4b5-4dcb-4d3d-87fc-93a0d8730d3d',
    sourceUrl: 'https://jobs.lever.co/paytm/8182f4b5-4dcb-4d3d-87fc-93a0d8730d3d',
    applyUrl: 'https://jobs.lever.co/paytm/8182f4b5-4dcb-4d3d-87fc-93a0d8730d3d/apply',
    employmentType: 'Full-time Employment',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: new Date(sampleLeverJobs[0].createdAt).toISOString(),
    closingDate: null,
    jobDescription: 'Own vendor invoices and payment cycles.',
    remoteStatus: 'On-site',
  })
})

test('Paytm run keeps the scraper on the verified first-party careers handoff and live India Lever jobs only', async () => {
  const paytm = await loadPaytmModule()
  const requestedPages = []
  const requestedJson = []

  const jobs = await paytm.createPaytmScraper({
    now: () => '2026-07-16T00:00:00.000Z',
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === paytm.CAREERS_URL) {
        return {
          status: 200,
          url,
          html: officialCareersHtml,
        }
      }

      if (url === paytm.LEVER_BOARD_URL) {
        return {
          status: 200,
          url,
          html: officialLeverBoardHtml,
        }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)

      if (url === paytm.LEVER_API_URL) {
        return sampleLeverJobs
      }

      throw new Error(`Unexpected json URL: ${url}`)
    },
  }).run()

  assert.deepEqual(requestedPages, [
    paytm.CAREERS_URL,
    paytm.LEVER_BOARD_URL,
  ])
  assert.deepEqual(requestedJson, [paytm.LEVER_API_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'paytm')
  assert.equal(jobs[0].link, 'https://jobs.lever.co/paytm/8182f4b5-4dcb-4d3d-87fc-93a0d8730d3d/apply')
  assert.equal(jobs[0].scrapedAt, '2026-07-16T00:00:00.000Z')
})

test('Paytm fails closed when the verified careers handoff or public Lever board changes materially', async () => {
  const paytm = await loadPaytmModule()

  await assert.rejects(
    paytm.createPaytmScraper({
      fetchPage: async (url) => {
        if (url === paytm.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: officialCareersHtml.replace('View All Roles', 'Browse Jobs'),
          }
        }

        throw new Error(`Unexpected page URL: ${url}`)
      },
      fetchJson: async () => sampleLeverJobs,
    }).run(),
    /verified official careers page/i,
  )

  await assert.rejects(
    paytm.createPaytmScraper({
      fetchPage: async (url) => {
        if (url === paytm.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: officialCareersHtml,
          }
        }

        if (url === paytm.LEVER_BOARD_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Board changed</h1></body></html>',
          }
        }

        throw new Error(`Unexpected page URL: ${url}`)
      },
      fetchJson: async () => sampleLeverJobs,
    }).run(),
    /verified public Lever board/i,
  )
})
