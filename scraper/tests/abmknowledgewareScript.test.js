import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>ABM - Digital Government that Works | Leader in e-Municipality</title>
    <meta
      name="description"
      content="ABM Knowledgeware delivers digital government services, e-Governance platforms, SAP Services and Smart Water Management solutions."
    />
  </head>
  <body>
    <header>
      <a href="/home/contact_us">Contact Us</a>
      <a href="https://abmindia.com/home/abm_career">Careers</a>
    </header>
    <main>
      <section>
        <h2>ABM first choice for E-Governance</h2>
        <p>
          ABM KNOWLEDGEWARE LTD. (ABM), IT Software and Services Company (BSE 531161),
          is one of the few IT companies in India with exclusive focus on e-Governance since 1998.
        </p>
        <p>Citizen Services delivered last year</p>
        <p>Digital Government services</p>
      </section>
      <section>
        <h3>Careers</h3>
        <p>Explore Careers We appreciate your interest in exploring career <br> opportunities with us.</p>
        <a href="https://abmindia.com/home/abm_career">Explore</a>
      </section>
    </main>
  </body>
</html>
`

const careersNoPublicJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career opportunities | ABM Knowledgeware Ltd</title>
    <meta
      name="description"
      content="Career opportunities at ABM Knowledgeware Ltd."
    />
  </head>
  <body>
    <main>
      <h1>WHY JOIN ABM KNOWLEDGEWARE?</h1>
      <h2><strong>For job Opening contact</strong> careers@abmindia.com</h2>
      <section>
        <h3>CONTACT US</h3>
        <p>ABM Knowledgeware Limited.</p>
        <p>ABM House, Plot No. 268, Linking Road, Bandra(West) Mumbai- 400 050, India.</p>
        <p>+91 22 4290 9700</p>
        <p>egovernance@abmindia.com, cs@abmindia.com</p>
      </section>
    </main>
  </body>
</html>
`

const loadAbmKnowledgewareModule = async () => {
  try {
    return await import('../abmknowledgeware/script.js')
  } catch {
    return null
  }
}

test('ABM Knowledgeware recognizes the verified official homepage and resume-only careers page', async () => {
  const abmKnowledgeware = await loadAbmKnowledgewareModule()
  assert.ok(
    abmKnowledgeware,
    'Expected ABM Knowledgeware scraper module at ../abmknowledgeware/script.js',
  )

  assert.equal(abmKnowledgeware.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(abmKnowledgeware.hasOfficialCareersSignal(careersNoPublicJobsHtml), true)
  assert.equal(abmKnowledgeware.pageExposesPublicJobListings(careersNoPublicJobsHtml), false)
  assert.equal(
    abmKnowledgeware.pageExposesPublicJobListings(
      `${careersNoPublicJobsHtml}<section><h2>Current Openings</h2><a href="/jobs/senior-engineer">Apply Now</a></section>`,
    ),
    true,
  )
})

test('ABM Knowledgeware returns no jobs only while the verified official careers page remains resume-only', async () => {
  const abmKnowledgeware = await loadAbmKnowledgewareModule()
  assert.ok(
    abmKnowledgeware,
    'Expected ABM Knowledgeware scraper module at ../abmknowledgeware/script.js',
  )

  const requestedUrls = []

  const jobs = await abmKnowledgeware.createAbmKnowledgewareScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === abmKnowledgeware.HOMEPAGE_URL) {
        return {
          ok: true,
          status: 200,
          url,
          text: homepageHtml,
        }
      }

      if (url === abmKnowledgeware.CAREERS_URL) {
        return {
          ok: true,
          status: 200,
          url,
          text: careersNoPublicJobsHtml,
        }
      }

      throw new Error(`Unexpected fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    abmKnowledgeware.HOMEPAGE_URL,
    abmKnowledgeware.CAREERS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('ABM Knowledgeware fails closed when the homepage or careers page contract changes', async () => {
  const abmKnowledgeware = await loadAbmKnowledgewareModule()
  assert.ok(
    abmKnowledgeware,
    'Expected ABM Knowledgeware scraper module at ../abmknowledgeware/script.js',
  )

  await assert.rejects(
    abmKnowledgeware.createAbmKnowledgewareScraper().run({
      fetchPage: async (url) => ({
        ok: true,
        status: 200,
        url,
        text: url === abmKnowledgeware.HOMEPAGE_URL
          ? '<html><head><title>Placeholder</title></head><body>Welcome</body></html>'
          : careersNoPublicJobsHtml,
      }),
    }),
    /official ABM Knowledgeware homepage/i,
  )

  await assert.rejects(
    abmKnowledgeware.createAbmKnowledgewareScraper().run({
      fetchPage: async (url) => ({
        ok: true,
        status: 200,
        url,
        text: url === abmKnowledgeware.HOMEPAGE_URL
          ? homepageHtml
          : '<html><head><title>Careers</title></head><body><h1>Careers</h1></body></html>',
      }),
    }),
    /official ABM Knowledgeware careers page/i,
  )

  await assert.rejects(
    abmKnowledgeware.createAbmKnowledgewareScraper().run({
      fetchPage: async (url) => ({
        ok: true,
        status: 200,
        url,
        text: url === abmKnowledgeware.HOMEPAGE_URL
          ? homepageHtml
          : `${careersNoPublicJobsHtml}<section><h2>Open Positions</h2><a href="/jobs/senior-engineer">Apply Now</a></section>`,
      }),
    }),
    /public job listings/i,
  )
})
