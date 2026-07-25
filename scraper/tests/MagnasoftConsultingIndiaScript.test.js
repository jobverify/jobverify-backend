import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Magnasoft</title>
  </head>
  <body>
    <h1>Careers</h1>
    <p>Offices: USA | UK | Netherlands | India</p>
    <a href="https://www.magnasoft.com/talk-to-us/">Talk to Us</a>
    <form>
      <label>Full Name</label>
      <input name="fullName" />
      <button>Contact Us</button>
    </form>
  </body>
</html>
`

const driftHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Magnasoft</title>
  </head>
  <body>
    <h1>Careers</h1>
    <article class="job-card">
      <h2>GIS Engineer</h2>
      <a href="/careers/gis-engineer">Apply Now</a>
    </article>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../magnasoftconsultingindia/script.js')
  } catch {
    assert.fail('Expected Magnasoft Consulting India scraper module at ../magnasoftconsultingindia/script.js')
  }
}

test('Magnasoft Consulting India stays pinned to the verified careers shell without public job cards', async () => {
  const magnasoft = await loadModule()

  assert.equal(magnasoft.hasOfficialCareersShellSignal(careersHtml), true)
  assert.equal(magnasoft.hasPublicJobsSignal(careersHtml), false)
})

test('Magnasoft Consulting India run validates the verified first-party shell and stays fail-closed', async () => {
  const magnasoft = await loadModule()
  const jobs = await magnasoft.createMagnasoftConsultingIndiaScraper().run({
    fetchText: async (url) => {
      assert.equal(url, magnasoft.CAREERS_URL)
      return careersHtml
    },
  })

  assert.deepEqual(jobs, [])
})

test('Magnasoft Consulting India fails closed when the verified no-public-jobs shell drifts into listings', async () => {
  const magnasoft = await loadModule()

  await assert.rejects(
    magnasoft.createMagnasoftConsultingIndiaScraper().run({
      fetchText: async () => driftHtml,
    }),
    /appears to expose public jobs/i,
  )
})
