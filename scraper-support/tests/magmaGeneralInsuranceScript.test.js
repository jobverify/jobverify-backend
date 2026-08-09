import assert from 'node:assert/strict'
import test from 'node:test'

const PRIMARY_URL = 'https://www.magmainsurance.com/fi/more/career'
const ALTERNATE_URL = 'https://www.magmainsurance.com/career'

const primaryCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>General Insurance Company India | Careers &amp; Opportunities - Magma Insurance - Magma</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <p>Be a part of the Magma family!</p>
      <h2>Apply for Job</h2>
      <label>Educational Qualification</label>
      <label>Insurance Experience</label>
      <label>Location</label>
      <label>Upload CV</label>
    </main>
  </body>
</html>
`

const alternateCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career - Magma Insurance - Magma</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <h2>Apply for Job</h2>
      <label>Insurance Experience</label>
      <label>Location</label>
      <label>Upload CV</label>
    </main>
  </body>
</html>
`

const loadMagmaModule = async () => {
  try {
    return await import('../../scraper/magmageneralinsurance/script.js')
  } catch {
    assert.fail('Expected Magma General Insurance scraper module at ../../scraper/magmageneralinsurance/script.js')
  }
}

test('Magma General Insurance validates the current first-party form-only careers pages', async () => {
  const magma = await loadMagmaModule()

  assert.equal(magma.SOURCE, 'magmageneralinsurance')
  assert.equal(magma.VERIFIED_ON, '2026-08-03')
  assert.equal(magma.CAREERS_URL, PRIMARY_URL)
  assert.equal(magma.ALTERNATE_CAREERS_URL, ALTERNATE_URL)
  assert.equal(magma.hasPrimaryCareersSignal(primaryCareersHtml), true)
  assert.equal(magma.hasAlternateCareersSignal(alternateCareersHtml), true)
  assert.equal(magma.hasPublicJobListingsSignal(primaryCareersHtml), false)
})

test('Magma General Insurance returns [] while both validated pages remain form-only', async () => {
  const magma = await loadMagmaModule()
  const requestedUrls = []

  const jobs = await magma.createMagmaGeneralInsuranceScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === PRIMARY_URL) return primaryCareersHtml
      if (url === ALTERNATE_URL) return alternateCareersHtml
      throw new Error(`Unexpected Magma General Insurance URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [PRIMARY_URL, ALTERNATE_URL])
  assert.deepEqual(jobs, [])
})
