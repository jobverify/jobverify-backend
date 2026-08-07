import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Neudesic</title>
  </head>
  <body>
    <h1>Careers</h1>
    <h2>Search India Openings by Region</h2>
    <a href="https://www.linkedin.com/jobs/search/?geoId=103644278&f_C=14887">Greater Bengaluru Area</a>
    <a href="https://www.linkedin.com/jobs/search/?geoId=105214831&f_C=14887">Bengaluru, Karnataka</a>
    <a href="https://www.linkedin.com/jobs/search/?geoId=104869687&f_C=14887">Hyderabad, Telangana</a>
    <a href="https://www.neudesic.com/careers/phishing-scams/">Phishing Scams</a>
    <a href="https://www.neudesic.com/careers/lca-notices/">Click Here</a>
    <p>Neudesic is an IBM subsidiary.</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/neudesictechnologies/script.js')
  } catch {
    assert.fail('Expected Neudesic Technologies scraper module at ../../scraper/neudesictechnologies/script.js')
  }
}

test('Neudesic Technologies validates the first-party careers shell and stays fail-closed when only LinkedIn region links are present', async () => {
  const neudesic = await loadModule()

  assert.equal(neudesic.SOURCE, 'neudesictechnologies')
  assert.equal(neudesic.COMPANY, 'Neudesic Technologies')
  assert.equal(neudesic.CAREERS_URL, 'https://www.neudesic.com/careers/')
  assert.equal(neudesic.VERIFIED_ON, '2026-08-03')
  assert.equal(neudesic.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(neudesic.hasFirstPartyJobsSignal(careersHtml), false)

  const jobs = await neudesic.createNeudesicTechnologiesScraper().run({
    fetchText: async () => careersHtml,
  })

  assert.deepEqual(jobs, [])
})

test('Neudesic Technologies fails closed if the first-party careers page starts exposing a direct public jobs feed', async () => {
  const neudesic = await loadModule()

  await assert.rejects(
    neudesic.createNeudesicTechnologiesScraper().run({
      fetchText: async () => `${careersHtml}<a href="https://www.neudesic.com/careers/software-engineer">Software Engineer</a>`,
    }),
    /public first-party jobs surface/i,
  )
})
