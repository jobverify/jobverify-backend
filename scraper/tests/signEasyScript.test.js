import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Signeasy | Signeasy</title>
  </head>
  <body>
    <main>
      <h1>Join our tribe</h1>
      <p>At Signeasy, we are on a mission to make contract management easy, seamless, and delightful.</p>
      <button>Apply Now</button>
      <section>
        <h2>Our principles</h2>
        <h3>Make the customer hero</h3>
      </section>
      <section>
        <h2>Perks and benefits</h2>
        <h3>Hybrid work</h3>
      </section>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../signeasy/script.js')
  } catch {
    assert.fail('Expected SignEasy scraper module at ../signeasy/script.js')
  }
}

test('SignEasy helpers stay pinned to the verified official careers page with no trustworthy public roles', async () => {
  const signeasy = await loadModule()

  assert.equal(signeasy.SOURCE, 'signeasy')
  assert.equal(signeasy.COMPANY_NAME, 'SignEasy')
  assert.equal(signeasy.OFFICIAL_BRAND_NAME, 'Signeasy')
  assert.equal(signeasy.VERIFIED_ON, '2026-07-17')
  assert.equal(signeasy.CAREERS_URL, 'https://signeasy.com/careers')
  assert.equal(signeasy.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(signeasy.hasNoTrustworthyPublicJobsSignal(careersHtml), true)
  assert.equal(
    signeasy.hasNoTrustworthyPublicJobsSignal(
      careersHtml.replace(
        '</main>',
        '<article class="job-card"><h2>Account Executive</h2><a href="/careers/account-executive">View Job</a></article></main>',
      ),
    ),
    false,
  )
})

test('SignEasy run validates the official careers page and returns an honest empty list while no trustworthy public jobs are exposed', async () => {
  const signeasy = await loadModule()
  const requestedUrls = []

  const jobs = await signeasy.createSigneasyScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, [signeasy.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('SignEasy fails closed when the verified careers shell drifts or trustworthy public jobs appear', async () => {
  const signeasy = await loadModule()

  await assert.rejects(
    signeasy.createSigneasyScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified signeasy careers page/i,
  )

  await assert.rejects(
    signeasy.createSigneasyScraper().run({
      fetchText: async () =>
        careersHtml.replace(
          '</main>',
          '<article class="job-card"><h2>Account Executive</h2><a href="/careers/account-executive">View Job</a></article></main>',
        ),
    }),
    /trustworthy public jobs/i,
  )
})
