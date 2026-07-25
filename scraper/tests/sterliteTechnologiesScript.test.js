import assert from 'node:assert/strict'
import test from 'node:test'

const CAREERS_HANDOFF_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Join STL Tech | Life at STL Tech | Careers</title>
  </head>
  <body>
    <h1>We are STLers</h1>
    <h2>WORLD OF OPPORTUNITIES</h2>
    <h2>Join us</h2>
    <p>85% of our employees feel that STL is a great place to be.</p>
    <p>Work with a smart, accessible, friendly and fun team; you will always have someone to help you out, teach you something new or grab lunch with.</p>
    <a href="https://stltech.ripplehire.com/candidate/?source=CAREERSITE&token=v0cOTxD3fgZqIF393gqj">
      Apply for your next job here
    </a>
    <a href="https://share.hsforms.com/example">Join STL USA - Apply Now</a>
    <footer>© 2026-27 STL Tech All Rights Reserved.</footer>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../sterlitetechnologies/script.js')
  } catch {
    assert.fail('Expected Sterlite Technologies scraper module at ../sterlitetechnologies/script.js')
  }
}

test('Sterlite Technologies sentinel helpers stay pinned to the verified first-party careers handoff page', async () => {
  const sterliteTechnologies = await loadModule()

  assert.equal(sterliteTechnologies.SOURCE, 'sterlitetechnologies')
  assert.equal(sterliteTechnologies.COMPANY_NAME, 'Sterlite Technologies')
  assert.equal(sterliteTechnologies.OFFICIAL_BRAND_NAME, 'STL Tech')
  assert.equal(sterliteTechnologies.VERIFIED_ON, '2026-07-17')
  assert.equal(sterliteTechnologies.CAREERS_URL, 'https://stl.tech/life/')
  assert.equal(
    sterliteTechnologies.LINKED_JOBS_PORTAL_URL,
    'https://stltech.ripplehire.com/candidate/?source=CAREERSITE&token=v0cOTxD3fgZqIF393gqj',
  )
  assert.equal(sterliteTechnologies.LINKED_JOBS_PORTAL_HOST, 'stltech.ripplehire.com')
  assert.equal(sterliteTechnologies.hasOfficialCareersSignal(CAREERS_HANDOFF_HTML), true)
  assert.equal(
    sterliteTechnologies.hasOfficialCareersSignal('<html><body><h1>Join us</h1></body></html>'),
    false,
  )
  assert.equal(sterliteTechnologies.hasEnumerablePublicJobsSignal(CAREERS_HANDOFF_HTML), false)
  assert.equal(
    sterliteTechnologies.hasEnumerablePublicJobsSignal(
      '<html><body><h2>Current Openings</h2><a href="/jobs/sap-fico-consultant">Apply Now</a></body></html>',
    ),
    true,
  )
})

test('Sterlite Technologies sentinel returns [] only while the verified first-party careers page remains a handoff surface', async () => {
  const sterliteTechnologies = await loadModule()
  const requestedUrls = []

  const jobs = await sterliteTechnologies.createSterliteTechnologiesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return CAREERS_HANDOFF_HTML
    },
  })

  assert.deepEqual(requestedUrls, [sterliteTechnologies.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Sterlite Technologies sentinel fails closed when the first-party careers handoff contract drifts into an enumerable jobs surface', async () => {
  const sterliteTechnologies = await loadModule()

  await assert.rejects(
    sterliteTechnologies.createSterliteTechnologiesScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /verified first-party careers page/i,
  )

  await assert.rejects(
    sterliteTechnologies.createSterliteTechnologiesScraper().run({
      fetchText: async () => CAREERS_HANDOFF_HTML.replace('stltech.ripplehire.com', 'jobs.example.com'),
    }),
    /verified first-party careers page/i,
  )

  await assert.rejects(
    sterliteTechnologies.createSterliteTechnologiesScraper().run({
      fetchText: async () => `${CAREERS_HANDOFF_HTML}<section><h2>Current Openings</h2><a href="/jobs/sap-fico-consultant">Apply Now</a></section>`,
    }),
    /enumerable public jobs/i,
  )
})
