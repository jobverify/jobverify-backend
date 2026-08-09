import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const JOBS_ARCHIVE_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <p>Home / Job</p>
      <h1>Job Archives</h1>
      <a href="https://www.kei-ind.com/jobs/executive/">Executive</a>
      <a href="/jobs/design-engineer/">Design Engineer</a>
      <a href="/jobs/business-development-marketing/">Business Development (Marketing)</a>
      <a href="/jobs/our-esg-vision-purpose/">Our ESG Vision/ Purpose</a>
      <a href="/jobs/design-engineer/">Design Engineer duplicate</a>
    </main>
  </body>
</html>
`

const EXECUTIVE_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <p>Home / Jobs / Executive</p>
      <h1>Executive</h1>
      <h2>Job Features</h2>
      <ul>
        <li>Locations : Mumbai</li>
        <li>Department : Marketing</li>
        <li>Experience : Fresher OR 1-2 years of experience in Loyalty program</li>
        <li>Qualification : Graduate</li>
      </ul>
      <h2>Apply Online</h2>
    </main>
  </body>
</html>
`

const DESIGN_ENGINEER_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <p>Home / Jobs / Design Engineer</p>
      <h1>Design Engineer</h1>
      <h2>Job Features</h2>
      <ul>
        <li>Locations : Mumbai</li>
        <li>Department : Marketing</li>
        <li>Experience : 0-2 years</li>
        <li>Qualification : BE / B Tech (Electrical)</li>
      </ul>
      <h2>Apply Online</h2>
    </main>
  </body>
</html>
`

const BUSINESS_DEVELOPMENT_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <p>Home / Jobs / Business Development (Marketing)</p>
      <h1>Business Development (Marketing)</h1>
      <h2>Job Description</h2>
      <p>Help grow channel and project sales for KEI Industries.</p>
      <h2>Job Features</h2>
      <ul>
        <li>Locations : HO</li>
        <li>Experience : 4-7 Years</li>
        <li>Qualification : BBA/MBA (MKT)</li>
      </ul>
      <h2>Apply Online</h2>
    </main>
  </body>
</html>
`

const ESG_ARTICLE_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Our ESG Vision/ Purpose</h1>
      <p>At KEI, our ESG vision is rooted in responsible manufacturing.</p>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/keiindustries/script.js')
  } catch {
    assert.fail('Expected KEI Industries scraper module at ../../scraper/keiindustries/script.js')
  }
}

test('KEI Industries helpers stay pinned to the verified first-party archive and detail-page contract', async () => {
  const kei = await loadModule()

  assert.equal(kei.SOURCE, 'keiindustries')
  assert.equal(kei.COMPANY, 'KEI Industries')
  assert.equal(kei.OFFICIAL_BRAND_NAME, 'KEI Industries')
  assert.equal(kei.COMPANY_DOMAIN, 'kei-ind.com')
  assert.equal(kei.VERIFIED_ON, '2026-07-17')
  assert.equal(kei.JOBS_ARCHIVE_URL, 'https://www.kei-ind.com/jobs/')
  assert.equal(kei.hasOfficialJobsArchiveSignal(JOBS_ARCHIVE_HTML), true)
  assert.deepEqual(kei.extractJobDetailUrls(JOBS_ARCHIVE_HTML), [
    'https://www.kei-ind.com/jobs/business-development-marketing/',
    'https://www.kei-ind.com/jobs/design-engineer/',
    'https://www.kei-ind.com/jobs/executive/',
    'https://www.kei-ind.com/jobs/our-esg-vision-purpose/',
  ])
  assert.equal(kei.isValidatedJobDetailPage(EXECUTIVE_HTML), true)
  assert.equal(kei.isValidatedJobDetailPage(ESG_ARTICLE_HTML), false)
})

test('KEI Industries extracts validated first-party jobs and ignores non-job archive posts', async () => {
  const kei = await loadModule()

  assert.deepEqual(
    kei.extractJobFromDetailPage({
      url: 'https://www.kei-ind.com/jobs/executive/',
      html: EXECUTIVE_HTML,
    }),
    {
      title: 'Executive',
      company: 'KEI Industries',
      department: 'Marketing',
      location: 'Mumbai, India',
      city: 'Mumbai',
      country: 'India',
      jobId: 'executive',
      requisitionId: 'executive',
      sourceUrl: 'https://www.kei-ind.com/jobs/executive/',
      applyUrl: 'https://www.kei-ind.com/jobs/executive/',
      employmentType: null,
      experienceRequired: 'Fresher OR 1-2 years of experience in Loyalty program',
      minimumQualification: 'Graduate',
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
  )

  assert.equal(
    kei.extractJobFromDetailPage({
      url: 'https://www.kei-ind.com/jobs/our-esg-vision-purpose/',
      html: ESG_ARTICLE_HTML,
    }),
    null,
  )
})

test('KEI Industries run decorates only validated first-party job detail pages for persistence', async () => {
  const kei = await loadModule()
  const requestedUrls = []

  const jobs = await kei.createKeiIndustriesScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === kei.JOBS_ARCHIVE_URL) {
        return { status: 200, url, html: JOBS_ARCHIVE_HTML }
      }

      if (url === 'https://www.kei-ind.com/jobs/executive/') {
        return { status: 200, url, html: EXECUTIVE_HTML }
      }

      if (url === 'https://www.kei-ind.com/jobs/design-engineer/') {
        return { status: 200, url, html: DESIGN_ENGINEER_HTML }
      }

      if (url === 'https://www.kei-ind.com/jobs/business-development-marketing/') {
        return { status: 200, url, html: BUSINESS_DEVELOPMENT_HTML }
      }

      if (url === 'https://www.kei-ind.com/jobs/our-esg-vision-purpose/') {
        return { status: 200, url, html: ESG_ARTICLE_HTML }
      }

      throw new Error(`Unexpected KEI Industries URL: ${url}`)
    },
    now: () => FIXED_SCRAPED_AT,
  })

  assert.deepEqual(requestedUrls, [
    kei.JOBS_ARCHIVE_URL,
    'https://www.kei-ind.com/jobs/business-development-marketing/',
    'https://www.kei-ind.com/jobs/design-engineer/',
    'https://www.kei-ind.com/jobs/executive/',
    'https://www.kei-ind.com/jobs/our-esg-vision-purpose/',
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].title, 'Business Development (Marketing)')
  assert.equal(jobs[0].source, 'keiindustries')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})

test('KEI Industries scraper fails closed when the verified archive or first-party detail host drifts', async () => {
  const kei = await loadModule()

  await assert.rejects(
    kei.createKeiIndustriesScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: kei.JOBS_ARCHIVE_URL,
        html: '<html><body><h1>Unexpected</h1></body></html>',
      }),
    }),
    /verified jobs archive/i,
  )

  await assert.rejects(
    kei.createKeiIndustriesScraper().run({
      fetchPage: async (url) => {
        if (url === kei.JOBS_ARCHIVE_URL) {
          return { status: 200, url, html: JOBS_ARCHIVE_HTML }
        }

        return {
          status: 200,
          url: 'https://jobs.example.com/executive/',
          html: EXECUTIVE_HTML,
        }
      },
    }),
    /detail link moved off the verified first-party host/i,
  )
})
