import assert from 'node:assert/strict'
import test from 'node:test'

const blueConchReferenceHtml = `
<!doctype html>
<html>
  <body>
    <h1>UST BlueConch Wins Excellence Award for Best Security Practices in IT/ITES Sector</h1>
    <h2>About UST BlueConch</h2>
    <p>UST BlueConch specializes in products and platform engineering services.</p>
    <p>Visit us at https://www.ust.com/blueconch</p>
  </body>
</html>
`

const ustCareersHtml = `
<!doctype html>
<html>
  <body>
    <h1>Find your next role at UST</h1>
    <p>Discover UST</p>
    <p>UST is committed to working with and providing reasonable accommodation.</p>
    <p>careers@ust.com</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/ustblueconchtechnologies/script.js')
  } catch {
    assert.fail('Expected UST BlueConch Technologies scraper module at ../../scraper/ustblueconchtechnologies/script.js')
  }
}

test('UST BlueConch Technologies returns [] while only a generic UST careers page is publicly available', async () => {
  const blueConch = await loadModule()

  assert.equal(blueConch.hasBlueConchReferenceSignal(blueConchReferenceHtml), true)
  assert.equal(blueConch.hasGenericUstCareersSignal(ustCareersHtml), true)
  assert.equal(blueConch.pageExposesBlueConchSpecificJobs(ustCareersHtml), false)

  const jobs = await blueConch.createUstBlueConchTechnologiesScraper().run({
    fetchText: async (url) => {
      if (url === blueConch.BLUECONCH_REFERENCE_URL) return blueConchReferenceHtml
      if (url === blueConch.UST_CAREERS_URL) return ustCareersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
})

test('UST BlueConch Technologies fails closed when a BlueConch-specific public jobs surface appears', async () => {
  const blueConch = await loadModule()

  await assert.rejects(
    blueConch.createUstBlueConchTechnologiesScraper().run({
      fetchText: async (url) => {
        if (url === blueConch.BLUECONCH_REFERENCE_URL) return blueConchReferenceHtml
        if (url === blueConch.UST_CAREERS_URL) {
          return `${ustCareersHtml}<section><h2>UST BlueConch Open Positions</h2><a href="/blueconch/software-engineer">Apply Now</a></section>`
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /blueconch-specific public jobs surface/i,
  )
})
