import assert from 'node:assert/strict'
import test from 'node:test'

const loadProviderModule = async () => {
  try {
    return await import('../signitysolutions/provider.js')
  } catch {
    assert.fail('Expected Signity Solutions provider module at ../signitysolutions/provider.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../signitysolutions/script.js')
  } catch {
    assert.fail('Expected Signity Solutions scraper module at ../signitysolutions/script.js')
  }
}

const CAREERS_HTML = `
  <html>
    <head><title>Job Openings &amp; Career Opportunities at Signity Solutions</title></head>
    <body>
      <h2 class="heading mt-0 mb-2">Current Openings</h2>
      <div class="opening">
        <h3>Tech Lead</h3>
        <span>Job posted on</span><span>2nd June, 2026</span>
        <span>Experience in (Years)</span><span>8 - 13 Years</span>
        <span>No. of Positions</span><span>1</span>
        <span>Location</span><span>Mohali</span>
        <p>We are looking for an experienced Tech Lead with deep expertise in the MEAN/MERN stack.</p>
        <a class="btn" href="#career-form">Apply for this job</a>
      </div>
      <div class="opening">
        <h3>QA Lead</h3>
        <span>Job posted on</span><span>2nd June, 2026</span>
        <span>Experience in (Years)</span><span>10 - 12 Years</span>
        <span>No. of Positions</span><span>1</span>
        <span>Location</span><span>Mohali</span>
        <p>We are looking for an experienced and dynamic QA Lead to drive quality assurance initiatives.</p>
        <a class="btn" href="#career-form">Apply for this job</a>
      </div>
    </body>
  </html>
`

test('Signity Solutions exports local provider metadata for the verified first-party careers page', async () => {
  const providerModule = await loadProviderModule()
  const scriptModule = await loadScriptModule()

  assert.deepEqual(providerModule.provider, {
    source: 'signitysolutions',
    companyName: 'Signity Solutions',
    officialBrandName: 'Signity Solutions',
    adapter: 'script',
    modulePath: '../signitysolutions/script.js',
    homepageUrl: 'https://www.signitysolutions.com/',
    companyCareerPage: 'https://www.signitysolutions.com/careers',
    atsPlatform: 'official-company-careers',
    countryFilter: 'India',
    paginationStrategy: 'single-page-current-openings-accordion',
    extractionStrategy: 'verified-careers-page+inline-opening-sections+career-form-anchor',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    companyDomain: 'signitysolutions.com',
    verifiedOn: '2026-07-18',
    verifiedSurfaceSummary:
      'Verified on Saturday, July 18, 2026 that https://www.signitysolutions.com/careers was the live first-party Signity Solutions careers page and that it exposed inline public openings including Tech Lead and QA Lead with posting dates, Mohali location text, and the first-party #career-form apply anchor.',
    dryRunFile: 'signitysolutions/jobs.json',
  })

  assert.equal(scriptModule.CAREERS_URL, providerModule.provider.companyCareerPage)
})

test('Signity Solutions extracts normalized jobs from the verified careers page', async () => {
  const signity = await loadScriptModule()

  assert.equal(signity.hasOfficialCareersSignal(CAREERS_HTML), true)
  assert.deepEqual(
    signity.extractJobCards(CAREERS_HTML),
    [
      {
        title: 'Tech Lead',
        location: 'Mohali',
        sourceUrl: 'https://www.signitysolutions.com/careers',
        applyUrl: 'https://www.signitysolutions.com/careers#career-form',
      },
      {
        title: 'QA Lead',
        location: 'Mohali',
        sourceUrl: 'https://www.signitysolutions.com/careers',
        applyUrl: 'https://www.signitysolutions.com/careers#career-form',
      },
    ],
  )

  const jobs = await signity.run({
    fetchText: async (url) => {
      assert.equal(url, signity.CAREERS_URL)
      return CAREERS_HTML
    },
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.deepEqual(
    jobs.map((job) => [job.title, job.location, job.link, job.source]),
    [
      ['Tech Lead', 'Mohali', 'https://www.signitysolutions.com/careers#career-form', 'signitysolutions'],
      ['QA Lead', 'Mohali', 'https://www.signitysolutions.com/careers#career-form', 'signitysolutions'],
    ],
  )
})
