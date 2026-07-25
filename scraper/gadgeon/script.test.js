import assert from 'node:assert/strict'
import test from 'node:test'

const loadGadgeonModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Gadgeon scraper module at ./script.js')
  }
}

const pageData = {
  url: 'https://www.gadgeon.com/joinus/',
  title: 'Join Us | Gadgeon',
  text: 'Current Openings',
  jobs: [
    {
      title: 'Embedded Software Engineer',
      location: 'Kochi, India',
      experienceRequired: '3-5 years',
      department: 'Engineering',
    },
  ],
}

test('Gadgeon default page collector works with optimized pages that omit waitForTimeout', async () => {
  const gadgeon = await loadGadgeonModule()
  const requestedUrls = []
  const fakePage = {
    goto: async (url) => {
      requestedUrls.push(url)
    },
    waitForSelector: async () => {},
    evaluate: async () => pageData,
  }

  const jobs = await gadgeon.createGadgeonScraper({ maxJobs: 1 }).run({
    launchBrowserImpl: async () => ({ close: async () => {} }),
    createOptimizedPageImpl: async () => fakePage,
  })

  assert.deepEqual(requestedUrls, [gadgeon.CAREERS_PAGE_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'gadgeon')
  assert.equal(jobs[0].city, 'Kochi')
})
