import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Paramatrix Technologies Ltd.</title>
    <link rel="canonical" href="https://www.paramatrix.com/careers"/>
  </head>
  <body>
    <h2>Be a part of our talent network</h2>
    <p>Explore our diverse opportunities and job roles that reflects or match your potential set of expertise.</p>
    <h5>Java Developer (Java 21, Microservices, Springboot)</h5>
    <a onclick="selectOption('Java Developer (Java 21, Microservices, Springboot)')">Apply</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../paramatrixtechnologies/script.js')
  } catch {
    assert.fail('Expected Paramatrix Technologies scraper module at ../paramatrixtechnologies/script.js')
  }
}

test('Paramatrix Technologies validator stays pinned to the verified first-party careers page from Friday, July 17, 2026', async () => {
  const paramatrix = await loadModule()
  assert.equal(paramatrix.hasOfficialCareersSignal(careersHtml), true)
})

test('Paramatrix Technologies run validates the first-party careers page and stays fail-closed', async () => {
  const paramatrix = await loadModule()
  const jobs = await paramatrix.createParamatrixTechnologiesScraper().run({
    fetchText: async () => careersHtml,
  })

  assert.deepEqual(jobs, [])
})
