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
      <section>
        <h2>Our principles</h2>
        <p>Move fast and build deliberately.</p>
      </section>
      <section>
        <h2>Perks and benefits</h2>
        <p>Flexible work, meaningful ownership, and global teammates.</p>
      </section>
      <p>For early-stage teams ready to scale. Apply here</p>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/signeasy/script.js')
  } catch {
    assert.fail('Expected Signeasy scraper module at ../../scraper/signeasy/script.js')
  }
}

test('Signeasy accepts the verified careers page shell while no trustworthy public job cards are exposed', async () => {
  const signeasy = await loadModule()

  assert.equal(signeasy.SOURCE, 'signeasy')
  assert.equal(signeasy.COMPANY_NAME, 'SignEasy')
  assert.equal(signeasy.OFFICIAL_BRAND_NAME, 'Signeasy')
  assert.equal(signeasy.VERIFIED_ON, '2026-07-17')
  assert.equal(signeasy.CAREERS_URL, 'https://signeasy.com/careers')
  assert.equal(signeasy.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(signeasy.hasNoTrustworthyPublicJobsSignal(careersHtml), true)
})

test('Signeasy returns an honest empty list while the verified careers page still lacks trustworthy public jobs', async () => {
  const signeasy = await loadModule()

  const jobs = await signeasy.createSigneasyScraper().run({
    fetchText: async () => careersHtml,
  })

  assert.deepEqual(jobs, [])
})

test('Signeasy fails closed when public job cards appear on the verified careers page', async () => {
  const signeasy = await loadModule()

  await assert.rejects(
    signeasy.createSigneasyScraper().run({
      fetchText: async () => `${careersHtml}<a href="/careers/account-executive">View Job</a>`,
    }),
    /trustworthy public jobs/i,
  )
})
