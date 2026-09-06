import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html>
  <head>
    <title>Greenko Group</title>
  </head>
  <body>
    <a href="https://greenkogroup.darwinbox.in/ms/candidatev2/main/careers/allJobs">Careers</a>
    <p>Indiaâ€™s First Dispatchable Renewables Company</p>
    <p>Making Green Sustainable</p>
    <p>info@greenkogroup.com</p>
  </body>
</html>
`

const blockedDarwinboxShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <base href="/ms/candidatev2/">
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>
    <script type="module" src="/ms/dboxuilibrary/assets/dboxuilib_dist/www/build/db-components.esm.js"></script>
  </head>
  <body>
    <app-root></app-root>
  </body>
</html>
`

const loadGreenkoModule = async () => {
  try {
    return await import('../../scraper/greenko/script.js')
  } catch {
    assert.fail('Expected Greenko scraper module at ../../scraper/greenko/script.js')
  }
}

test('Greenko exports a stable exact-name wrapper over the verified Greenko Darwinbox contract', async () => {
  const greenko = await loadGreenkoModule()

  assert.equal(greenko.SOURCE, 'greenko')
  assert.equal(greenko.COMPANY, 'Greenko')
  assert.equal(greenko.OFFICIAL_BRAND_NAME, 'Greenko Hub')
  assert.equal(greenko.HOMEPAGE_URL, 'https://www.greenkogroup.com/')
  assert.equal(greenko.PUBLIC_JOBS_URL, 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/careers/allJobs')
  assert.equal(greenko.COMPANY_DOMAIN, 'greenkogroup.com')
  assert.equal(greenko.ATS_PLATFORM, 'darwinbox')
  assert.equal(greenko.COUNTRY_FILTER, 'India')
  assert.equal(greenko.PAGINATION_STRATEGY, 'browser-session-darwinbox-pagination')
  assert.equal(greenko.VERIFIED_ON, '2026-08-14')
  assert.match(greenko.VERIFIED_SURFACE_SUMMARY, /Greenko Group/i)
  assert.match(greenko.VERIFIED_SURFACE_SUMMARY, /Careers/i)
  assert.equal(greenko.hasVerifiedGreenkoHomepageSignal(homepageHtml), true)
  assert.deepEqual(
    greenko.decorateGreenkoJob(
      {
        title: 'Senior Engineer',
        company: 'Greenko Hub',
        source: 'greenkohub',
        jobId: 'DBX-1',
        link: 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/jobs/DBX-1',
        applyUrl: 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/jobs/DBX-1',
        sourceUrl: 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/jobs/DBX-1',
      },
      '2026-07-15T22:00:00.000Z',
    ),
    {
      title: 'Senior Engineer',
      company: 'Greenko',
      source: 'greenko',
      jobId: 'DBX-1',
      link: 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/jobs/DBX-1',
      applyUrl: 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/jobs/DBX-1',
      sourceUrl: 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/jobs/DBX-1',
      companyCareerPage: 'https://www.greenkogroup.com/',
      companyDomain: 'greenkogroup.com',
      atsPlatform: 'darwinbox',
      scrapedAt: '2026-07-15T22:00:00.000Z',
    },
  )
})

test('Greenko run validates the homepage and decorates jobs from the existing Greenko Hub scraper', async () => {
  const greenko = await loadGreenkoModule()
  const requestedUrls = []

  const jobs = await greenko.createGreenkoScraper({
    now: () => '2026-07-15T22:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, greenko.HOMEPAGE_URL)
      return homepageHtml
    },
    fetchListingPage: async () => ({
      jobs: [{
        title: 'Senior Engineer',
        company: 'Greenko Hub',
        department: 'Operations',
        location: 'Hyderabad, Telangana, India',
        city: 'Hyderabad',
        country: 'India',
        jobId: 'DBX-1',
        requisitionId: 'DBX-1',
        sourceUrl: 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/jobs/DBX-1',
        applyUrl: 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/jobs/DBX-1',
        employmentType: 'Full Time',
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: '2026-07-01',
        closingDate: null,
        jobDescription: 'Maintain energy systems.',
        remoteStatus: null,
      }],
      hasNextPage: false,
    }),
  })

  assert.deepEqual(requestedUrls, [
    greenko.HOMEPAGE_URL,
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'greenko')
  assert.equal(jobs[0].company, 'Greenko')
  assert.equal(jobs[0].companyCareerPage, greenko.HOMEPAGE_URL)
  assert.equal(jobs[0].companyDomain, 'greenkogroup.com')
  assert.equal(jobs[0].atsPlatform, 'darwinbox')
  assert.equal(jobs[0].scrapedAt, '2026-07-15T22:00:00.000Z')
})

test('Greenko fails closed when the verified homepage drifts materially', async () => {
  const greenko = await loadGreenkoModule()

  await assert.rejects(
    greenko.createGreenkoScraper().run({
      fetchText: async () => '<html><body>Different homepage</body></html>',
      fetchListingPage: async () => ({ jobs: [], hasNextPage: false }),
    }),
    /verified Greenko homepage/i,
  )
})

test('Greenko returns [] when the shared verified Darwinbox allJobs shell is now Turnstile-guarded and the listings API is 403-blocked', async () => {
  const greenko = await loadGreenkoModule()

  const jobs = await greenko.createGreenkoScraper({
    now: () => '2026-08-13T17:45:00.000Z',
  }).run({
    fetchText: async (url) => {
      if (url === greenko.HOMEPAGE_URL) return homepageHtml
      if (url === greenko.PUBLIC_JOBS_URL) return blockedDarwinboxShellHtml
      throw new Error(`Unexpected Greenko URL: ${url}`)
    },
    fetchListingPage: async () => {
      throw new Error(`HTTP 403 for ${greenko.PUBLIC_JOBS_URL}`)
    },
  })

  assert.deepEqual(jobs, [
    {
      title: 'Current openings at Greenko Hub',
      company: 'Greenko',
      location: 'India',
      city: null,
      country: 'India',
      link: 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/careers/allJobs',
      applyUrl: 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/careers/allJobs',
      sourceUrl: 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/careers/allJobs',
      source: 'greenko',
      jobId: 'greenkohub-current-openings',
      requisitionId: 'greenkohub-current-openings',
      department: null,
      employmentType: null,
      experienceRequired: null,
      jobDescription:
        'The official Greenko Hub homepage and public Darwinbox shell remained reachable, but the public Darwinbox inventory API returned HTTP 403 during this scrape. Review current openings directly on https://greenkogroup.darwinbox.in/ms/candidatev2/main/careers/allJobs.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      remoteStatus: null,
      postingDate: null,
      closingDate: null,
      scrapedAt: '2026-08-13T17:45:00.000Z',
      companyCareerPage: 'https://www.greenkogroup.com/',
      companyDomain: 'greenkogroup.com',
      atsPlatform: 'darwinbox',
    },
  ])
})
