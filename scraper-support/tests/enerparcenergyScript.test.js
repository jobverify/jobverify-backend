import assert from 'node:assert/strict'
import test from 'node:test'

const loadEnerparcEnergyModule = async () => {
  try {
    return await import('../../scraper/enerparcenergy/script.js')
  } catch {
    assert.fail('Expected Enerparc Energy scraper module at ../../scraper/enerparcenergy/script.js')
  }
}

const careersHtml = `
  <!doctype html>
  <html lang="en">
    <body>
      <h1>Apply Now</h1>
      <section>
        <h2>Careers</h2>
        <p>Enerparc is a certified Great Place to Work.</p>
        <a href="https://enerparc.zohorecruit.in/jobs/Careers">Apply Now</a>
      </section>
      <footer>
        <p>Enerparc Energy Pvt. Ltd.</p>
      </footer>
    </body>
  </html>
`

test('validates the official Enerparc Energy careers surface and returns no unverified listings', async () => {
  const enerparcenergy = await loadEnerparcEnergyModule()
  const requestedUrls = []

  assert.equal(enerparcenergy.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(enerparcenergy.hasNoPublicListingsSignal(careersHtml), true)

  const jobs = await enerparcenergy.createEnerparcEnergyScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === enerparcenergy.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [enerparcenergy.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('fails closed when the Enerparc Energy careers identity changes', async () => {
  const enerparcenergy = await loadEnerparcEnergyModule()

  await assert.rejects(
    enerparcenergy.createEnerparcEnergyScraper().run({
      fetchText: async () => '<html><body>Unrelated site</body></html>',
    }),
    /verified official careers surface/i,
  )
})

test('fails closed when the Enerparc Energy page exposes a public opening', async () => {
  const enerparcenergy = await loadEnerparcEnergyModule()
  const listedJobsHtml = careersHtml.replace(
    '</section>',
    '<h3>Current Openings</h3><a href="/jobs/solar-engineer">Solar Engineer</a></section>',
  )

  await assert.rejects(
    enerparcenergy.createEnerparcEnergyScraper().run({
      fetchText: async () => listedJobsHtml,
    }),
    /no-public-listings surface/i,
  )
})

test('can recover with a browser-backed Enerparc careers page when direct requests are blocked with HTTP 403', async () => {
  const enerparcenergy = await loadEnerparcEnergyModule()
  const browserUrls = []

  const jobs = await enerparcenergy.createEnerparcEnergyScraper().run({
    fetchText: async () => {
      throw new Error('HTTP 403 for https://enerparc.in/apply-now/')
    },
    fetchBrowserText: async (url) => {
      browserUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(browserUrls, [enerparcenergy.CAREERS_URL])
  assert.deepEqual(jobs, [])
})
