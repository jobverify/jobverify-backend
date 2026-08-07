import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Infiniti Software Solutions scraper module at ./script.js')
  }
}

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Travel Tech Jobs &amp; Careers at Infiniti Software Solutions</title>
  </head>
  <body>
    <h1>Dream Bold. Fly Higher. With Infiniti.</h1>
    <h2>Explore Job Opportunities</h2>

    <div class="elementor-widget-heading">
      <h2 class="elementor-heading-title elementor-size-default">Customer Success Manager</h2>
    </div>
    <div class="elementor-widget-text-editor">
      <p>Build long-term customer relationships and drive adoption.</p>
    </div>
    <div class="elementor-icon-box-title"><span>10+ Years</span></div>
    <div class="elementor-icon-box-title"><span>Chennai</span></div>
    <a class="elementor-button" href="https://app.goodfit.so/apply/G540dcuX">Apply</a>

    <div class="elementor-widget-heading">
      <h2 class="elementor-heading-title elementor-size-default">Business Development Manager</h2>
    </div>
    <div class="elementor-widget-text-editor">
      <p>Drive growth through strategic partnerships and client acquisition.</p>
    </div>
    <div class="elementor-icon-box-title"><span>5 - 8 Years</span></div>
    <div class="elementor-icon-box-title"><span>Mumbai</span></div>
    <a class="elementor-button" href="https://app.goodfit.so/apply/oJTXLABJ">Apply</a>
  </body>
</html>
`

const careersShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Travel Tech Jobs &amp; Careers at Infiniti Software Solutions</title>
  </head>
  <body>
    <h1>Explore Job Opportunities</h1>
    <a href="https://app.goodfit.so/apply/G540dcuX">Apply</a>
  </body>
</html>
`

test('Infiniti Software Solutions validates the current first-party shell and parses live-style job cards', async () => {
  const infiniti = await loadModule()

  assert.equal(infiniti.SOURCE, 'infinitisoftwaresolutions')
  assert.equal(infiniti.COMPANY, 'Infiniti Software Solutions')
  assert.equal(infiniti.CAREERS_URL, 'https://www.infinitisoftware.net/careers/')
  assert.equal(infiniti.hasOfficialCareersSignal(careersHtml), true)

  const jobs = infiniti.extractJobs(careersHtml)
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Customer Success Manager')
  assert.equal(jobs[0].location, 'Chennai, India')
  assert.equal(jobs[0].jobId, 'G540dcuX')
  assert.equal(jobs[1].location, 'Mumbai, India')
})

test('Infiniti Software Solutions falls back to a browser-backed page loader when Node fetch times out', async () => {
  const infiniti = await loadModule()
  const requestedPrimaryUrls = []
  const requestedBrowserUrls = []

  const jobs = await infiniti.createInfinitiSoftwareSolutionsScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedPrimaryUrls.push(url)
      throw new TypeError('fetch failed | Connect Timeout Error')
    },
    fetchBrowserText: async (url) => {
      requestedBrowserUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedPrimaryUrls, [infiniti.CAREERS_URL])
  assert.deepEqual(requestedBrowserUrls, [infiniti.CAREERS_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Customer Success Manager')
})

test('Infiniti Software Solutions recovers jobs from the live browser DOM when rendered HTML parsing yields no cards', async () => {
  const infiniti = await loadModule()

  const jobs = await infiniti.createInfinitiSoftwareSolutionsScraper().run({
    fetchText: async () => careersShellHtml,
    fetchBrowserJobs: async () => [
      {
        title: 'Customer Success Manager',
        jobDescription: 'Build long-term customer relationships and drive adoption.',
        experienceRequired: '10+ Years',
        city: 'Chennai',
        applyUrl: 'https://app.goodfit.so/apply/G540dcuX',
      },
      {
        title: 'Business Development Manager',
        jobDescription: 'Drive growth through partnerships.',
        experienceRequired: '5 - 8 Years',
        city: 'Mumbai',
        applyUrl: 'https://app.goodfit.so/apply/oJTXLABJ',
      },
    ],
  })

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Customer Success Manager')
  assert.equal(jobs[1].location, 'Mumbai, India')
})
