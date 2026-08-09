import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
  <html>
    <head><title>Careers - ValGenesis</title></head>
    <body>
      <h1>Careers</h1>
      <h2>Join the team, we're hiring!</h2>
      <p>Enough about us. We're looking forward to meeting you!</p>
      <p>Santa Clara | Toronto | Lisbon | Schiphol | Chennai | Bengaluru | Hyderabad</p>
    </body>
  </html>
`

const loadProviderModule = async () => {
  try {
    return await import('../../scraper/valgenesis/provider.js')
  } catch {
    assert.fail('Expected ValGenesis provider module at ../../scraper/valgenesis/provider.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/valgenesis/script.js')
  } catch {
    assert.fail('Expected ValGenesis scraper module at ../../scraper/valgenesis/script.js')
  }
}

test('ValGenesis exports a fail-closed local provider for the official careers page without a trustworthy public jobs feed', async () => {
  const providerModule = await loadProviderModule()
  const scriptModule = await loadScriptModule()

  assert.equal(providerModule.provider.source, 'valgenesis')
  assert.equal(providerModule.provider.companyName, 'ValGenesis')
  assert.equal(providerModule.provider.adapter, 'script')
  assert.equal(providerModule.provider.companyCareerPage, 'https://www.valgenesis.com/careers')
  assert.equal(providerModule.provider.atsPlatform, 'official-company-site-no-public-jobs-feed')
  assert.equal(providerModule.provider.countryFilter, 'India')
  assert.equal(providerModule.provider.verifiedOn, '2026-07-18')
  assert.match(providerModule.provider.verifiedSurfaceSummary, /Join the team, we're hiring!/i)
  assert.match(providerModule.provider.verifiedSurfaceSummary, /no trustworthy public jobs feed/i)
  assert.deepEqual(scriptModule.PROVIDER_METADATA, providerModule.provider)
})

test('ValGenesis sentinel accepts the verified careers marketing page and returns no jobs', async () => {
  const valGenesis = await loadScriptModule()

  assert.equal(valGenesis.hasVerifiedValGenesisCareersSignal(careersHtml), true)
  assert.equal(valGenesis.hasPublicJobOpeningSignal(careersHtml), false)

  const jobs = await valGenesis.createValGenesisScraper().run({
    fetchPage: async () => ({
      status: 200,
      url: 'https://www.valgenesis.com/careers',
      html: careersHtml,
    }),
  })

  assert.deepEqual(jobs, [])
})
