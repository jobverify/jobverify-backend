import assert from 'node:assert/strict'
import test from 'node:test'

import { createAstronicsScraper, hasCountryLimitedJobsPageWithoutIndia } from '../../scraper/astronics/script.js'

const usOnlyPage = `<html><head><title>Astronics Jobs in the United States</title></head><body><p>Home &gt; Careers &gt; US Jobs</p><h1>Astronics Career Search</h1><h2>United States</h2><a href="/canada-jobs">Search for Jobs in Canada</a><a href="/france-jobs">Search for Jobs in France</a><h3>E-Verify</h3><p>This employer participates in E-Verify.</p></body></html>`

test('Astronics recognizes the current country-limited U.S. page without India jobs', () => {
  assert.equal(hasCountryLimitedJobsPageWithoutIndia(usOnlyPage), true)
  assert.equal(hasCountryLimitedJobsPageWithoutIndia(usOnlyPage.replace('Search for Jobs in France', 'Search for Jobs in India')), false)
  assert.equal(hasCountryLimitedJobsPageWithoutIndia(usOnlyPage.replaceAll('E-Verify', 'Other notice')), false)
})

test('Astronics returns no India jobs when its official careers path reaches the country-limited page', async () => {
  const home = '<html><body>Astronics Test Systems Bangalore, India Â© Astronics Test Systems</body></html>'
  const careers = '<html><body><h1>Astronics Careers</h1><a href="https://www.astronics.com/us-jobs">United States jobs</a></body></html>'
  const requested = []
  const jobs = await createAstronicsScraper().run({ fetchText: async (url) => {
    requested.push(url)
    if (url === 'https://www.diagnosys.com/') return home
    if (url === 'https://www.astronics.com/careers') return careers
    if (url === 'https://www.astronics.com/us-jobs') return usOnlyPage
    throw new Error(`Unexpected URL ${url}`)
  } })
  assert.deepEqual(jobs, [])
  assert.deepEqual(requested, ['https://www.diagnosys.com/', 'https://www.astronics.com/careers', 'https://www.astronics.com/us-jobs'])
})
