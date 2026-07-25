import assert from 'node:assert/strict'
import test from 'node:test'

const loadGlobalOrizonModule = async () => {
  try {
    return await import('../globalorizon/script.js')
  } catch {
    assert.fail('Expected Global Orizon scraper module at ../globalorizon/script.js')
  }
}

const ourDataTeamHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Your Data Experts at your service, Call it ours | Global Orizon</title>
  </head>
  <body>
    <main>
      <h1>Do you know your data because Data is New Oil!</h1>
      <p>Data Engineering Perfected.</p>
      <p>OurDataTeam provides curated, labeled, and optimized training data services.</p>
      <a href="/the-hiring-partner-com">Our Hiring Partner</a>
    </main>
  </body>
</html>
`

const hiringPartnerHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Our Hiring Partner | Global Orizon</title>
  </head>
  <body>
    <main>
      <h1>Staffing & Recruitment Inclusive of BGV</h1>
      <h2>Join Our Team - We always hire</h2>
      <section>
        <h3>DevOps Engineers</h3>
        <span>India</span>
        <a href="https://www.thehiringpartner.com/">Apply</a>
      </section>
      <section>
        <h3>Data Engineers</h3>
        <span>India</span>
        <a href="https://www.thehiringpartner.com/">Apply</a>
      </section>
      <section>
        <h3>Security Engineers</h3>
        <span>India</span>
        <a href="https://www.thehiringpartner.com/">Apply</a>
      </section>
    </main>
  </body>
</html>
`

const organizationPayload = {
  success: true,
  data: {
    slug: 'global-orizon-9ma3d',
    name: 'Global Orizon',
    website: 'https://globalorizon.com',
    jobsAvailable: 0,
    jobs: [],
  },
}

test('Global Orizon validates the Our Data Team and Our Hiring Partner surfaces before returning no public jobs', async () => {
  const globalOrizon = await loadGlobalOrizonModule()

  assert.equal(globalOrizon.OUR_DATA_TEAM_URL, 'https://www.globalorizon.com/our-data-team-com')
  assert.equal(
    globalOrizon.OUR_HIRING_PARTNER_URL,
    'https://www.globalorizon.com/the-hiring-partner-com',
  )
  assert.equal(
    globalOrizon.PUBLIC_ORGANIZATION_URL,
    'https://api.thehiringpartner.com/public/organizations/by-slug/global-orizon-9ma3d',
  )
  assert.equal(globalOrizon.hasOfficialOurDataTeamSignal(ourDataTeamHtml), true)
  assert.equal(globalOrizon.hasOfficialHiringPartnerSignal(hiringPartnerHtml), true)
  assert.equal(globalOrizon.organizationHasZeroPublicJobs(organizationPayload), true)
})

test('Global Orizon returns an empty set when the linked public organization profile reports zero jobs', async () => {
  const globalOrizon = await loadGlobalOrizonModule()
  const requestedUrls = []

  const jobs = await globalOrizon.createGlobalOrizonScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === globalOrizon.OUR_DATA_TEAM_URL) return ourDataTeamHtml
      if (url === globalOrizon.OUR_HIRING_PARTNER_URL) return hiringPartnerHtml
      throw new Error(`Unexpected Global Orizon HTML fixture URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)
      if (url === globalOrizon.PUBLIC_ORGANIZATION_URL) return organizationPayload
      throw new Error(`Unexpected Global Orizon JSON fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    globalOrizon.OUR_DATA_TEAM_URL,
    globalOrizon.OUR_HIRING_PARTNER_URL,
    globalOrizon.PUBLIC_ORGANIZATION_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Global Orizon fails closed when the brand pages change or the public organization starts exposing jobs', async () => {
  const globalOrizon = await loadGlobalOrizonModule()

  await assert.rejects(
    globalOrizon.createGlobalOrizonScraper().run({
      fetchText: async (url) => {
        if (url === globalOrizon.OUR_DATA_TEAM_URL) {
          return '<html><body><h1>Data Services</h1></body></html>'
        }

        return hiringPartnerHtml
      },
      fetchJson: async () => organizationPayload,
    }),
    /Global Orizon Our Data Team surface changed/i,
  )

  await assert.rejects(
    globalOrizon.createGlobalOrizonScraper().run({
      fetchText: async (url) => {
        if (url === globalOrizon.OUR_DATA_TEAM_URL) return ourDataTeamHtml
        if (url === globalOrizon.OUR_HIRING_PARTNER_URL) {
          return '<html><body><h1>Our Hiring Partner</h1><p>Open roles live now</p></body></html>'
        }

        throw new Error(`Unexpected Global Orizon HTML fixture URL: ${url}`)
      },
      fetchJson: async () => organizationPayload,
    }),
    /Global Orizon Hiring Partner surface changed/i,
  )

  await assert.rejects(
    globalOrizon.createGlobalOrizonScraper().run({
      fetchText: async (url) => {
        if (url === globalOrizon.OUR_DATA_TEAM_URL) return ourDataTeamHtml
        if (url === globalOrizon.OUR_HIRING_PARTNER_URL) return hiringPartnerHtml
        throw new Error(`Unexpected Global Orizon HTML fixture URL: ${url}`)
      },
      fetchJson: async () => ({
        ...organizationPayload,
        data: {
          ...organizationPayload.data,
          jobsAvailable: 1,
          jobs: [{ id: 'job-1', title: 'Data Engineer' }],
        },
      }),
    }),
    /Global Orizon public organization profile now exposes jobs/i,
  )
})
