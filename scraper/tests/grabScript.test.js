import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T12:00:00.000Z'

const jobsBoardHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Grab your dream role</h1>
      <h2>Search Jobs</h2>
      <p>Displaying 1 to 20 of 358 matching jobs</p>
      <p>Location Cambodia China India Indonesia Malaysia Philippines Romania Singapore Thailand Vietnam</p>

      <article>
        <h2><a href="/en/jobs/744000138121215/solutions-specialist-epm-finance-systems/">Solutions Specialist (EPM), Finance Systems</a></h2>
        <ul>
          <li>Bangalore, India</li>
          <li>Technology Solutions</li>
        </ul>
      </article>

      <article>
        <h2><a href="/en/jobs/744000138024279/senior-software-engineer-mobile-android/">Senior Software Engineer, Mobile (Android)</a></h2>
        <ul>
          <li>Bangalore, India</li>
          <li>Engineering</li>
        </ul>
      </article>

      <article>
        <h2><a href="/en/jobs/744000999999/site-reliability-engineer-observability-platform/">Site Reliability Engineer, Observability platform</a></h2>
        <ul>
          <li>HCMC, Vietnam</li>
          <li>Engineering</li>
        </ul>
      </article>
    </main>
  </body>
</html>
`

const indiaLocationHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Welcome to India!</h1>
      <p>Our teams in India are putting Fintech in the fast lane and making an impact beyond service.</p>
      <p>Bangalore</p>
      <h2>Join our team in India</h2>
      <a href="/jobs">See all jobs</a>

      <article>
        <h2><a href="/en/jobs/744000109177995/senior-techno-functional-oracle-integration-specialist/">Senior Techno-Functional Oracle Integration Specialist</a></h2>
        <ul>
          <li>Bengaluru, India</li>
          <li>Technology Solutions</li>
        </ul>
      </article>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../grab/script.js')
  } catch {
    assert.fail('Expected Grab scraper module at ../grab/script.js')
  }
}

test('Grab helpers stay pinned to the verified first-party jobs board and India location surfaces from Friday, July 17, 2026', async () => {
  const grab = await loadModule()

  assert.equal(grab.SOURCE, 'grab')
  assert.equal(grab.COMPANY, 'Grab')
  assert.equal(grab.HOMEPAGE_URL, 'https://www.grab.careers/en/')
  assert.equal(grab.JOBS_URL, 'https://www.grab.careers/jobs')
  assert.equal(grab.INDIA_LOCATION_URL, 'https://www.grab.careers/en/locations/india/')
  assert.equal(grab.VERIFIED_ON, '2026-07-17')
  assert.match(grab.VERIFIED_SURFACE_SUMMARY, /Senior Techno-Functional Oracle Integration Specialist/i)
  assert.equal(grab.hasOfficialJobsBoardSignal(jobsBoardHtml), true)
  assert.equal(grab.hasOfficialIndiaLocationSignal(indiaLocationHtml), true)
})

test('Grab extracts India roles from the verified first-party jobs board and India location page', async () => {
  const grab = await loadModule()
  const jobsFromBoard = grab.extractJobsFromJobsBoardHtml(jobsBoardHtml, {
    scrapedAt: FIXED_SCRAPED_AT,
  })
  const jobsFromIndiaPage = grab.extractJobsFromIndiaLocationHtml(indiaLocationHtml, {
    scrapedAt: FIXED_SCRAPED_AT,
  })

  assert.deepEqual(jobsFromBoard, [
    {
      title: 'Solutions Specialist (EPM), Finance Systems',
      company: 'Grab',
      department: 'Technology Solutions',
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      link: 'https://www.grab.careers/en/jobs/744000138121215/solutions-specialist-epm-finance-systems/',
      applyUrl: 'https://www.grab.careers/en/jobs/744000138121215/solutions-specialist-epm-finance-systems/',
      sourceUrl: 'https://www.grab.careers/en/jobs/744000138121215/solutions-specialist-epm-finance-systems/',
      source: 'grab',
      jobId: '744000138121215',
      requisitionId: '744000138121215',
      employmentType: null,
      experienceRequired: null,
      jobDescription: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      remoteStatus: null,
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Senior Software Engineer, Mobile (Android)',
      company: 'Grab',
      department: 'Engineering',
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      link: 'https://www.grab.careers/en/jobs/744000138024279/senior-software-engineer-mobile-android/',
      applyUrl: 'https://www.grab.careers/en/jobs/744000138024279/senior-software-engineer-mobile-android/',
      sourceUrl: 'https://www.grab.careers/en/jobs/744000138024279/senior-software-engineer-mobile-android/',
      source: 'grab',
      jobId: '744000138024279',
      requisitionId: '744000138024279',
      employmentType: null,
      experienceRequired: null,
      jobDescription: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      remoteStatus: null,
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])

  assert.deepEqual(jobsFromIndiaPage, [
    {
      title: 'Senior Techno-Functional Oracle Integration Specialist',
      company: 'Grab',
      department: 'Technology Solutions',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      country: 'India',
      link: 'https://www.grab.careers/en/jobs/744000109177995/senior-techno-functional-oracle-integration-specialist/',
      applyUrl: 'https://www.grab.careers/en/jobs/744000109177995/senior-techno-functional-oracle-integration-specialist/',
      sourceUrl: 'https://www.grab.careers/en/jobs/744000109177995/senior-techno-functional-oracle-integration-specialist/',
      source: 'grab',
      jobId: '744000109177995',
      requisitionId: '744000109177995',
      employmentType: null,
      experienceRequired: null,
      jobDescription: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      remoteStatus: null,
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Grab run validates the verified first-party pages and returns normalized India jobs', async () => {
  const grab = await loadModule()
  const requestedUrls = []

  const jobs = await grab.createGrabScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === grab.JOBS_URL) return jobsBoardHtml
      if (url === grab.INDIA_LOCATION_URL) return indiaLocationHtml

      throw new Error(`Unexpected Grab text URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    grab.JOBS_URL,
    grab.INDIA_LOCATION_URL,
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].title, 'Solutions Specialist (EPM), Finance Systems')
  assert.equal(jobs[1].title, 'Senior Software Engineer, Mobile (Android)')
  assert.equal(jobs[2].title, 'Senior Techno-Functional Oracle Integration Specialist')
  assert.equal(jobs[2].companyDomain, 'grab.careers')
  assert.equal(jobs[2].companyCareerPage, 'https://www.grab.careers/jobs')
  assert.equal(jobs[2].atsPlatform, 'official-company-careers')
})

test('Grab fails closed when the verified jobs board or India location surface drifts, or when India jobs disappear', async () => {
  const grab = await loadModule()

  await assert.rejects(
    grab.createGrabScraper().run({
      fetchText: async (url) => {
        if (url === grab.JOBS_URL) return '<html><body><h1>Jobs</h1></body></html>'
        return indiaLocationHtml
      },
    }),
    /verified Grab jobs board/i,
  )

  await assert.rejects(
    grab.createGrabScraper().run({
      fetchText: async (url) => {
        if (url === grab.JOBS_URL) return jobsBoardHtml
        if (url === grab.INDIA_LOCATION_URL) return '<html><body><h1>India</h1></body></html>'
        throw new Error(`Unexpected Grab text URL: ${url}`)
      },
    }),
    /verified Grab India location page/i,
  )

  await assert.rejects(
    grab.createGrabScraper().run({
      fetchText: async (url) => {
        if (url === grab.JOBS_URL) {
          return jobsBoardHtml
            .replace('Bangalore, India', 'Singapore, Singapore')
            .replace('Bangalore, India', 'Singapore, Singapore')
        }

        if (url === grab.INDIA_LOCATION_URL) {
          return `
            <!doctype html>
            <html lang="en">
              <body>
                <main>
                  <h1>Welcome to India!</h1>
                  <p>Bangalore</p>
                  <h2>Join our team in India</h2>
                  <a href="/jobs">See all jobs</a>
                </main>
              </body>
            </html>
          `
        }

        throw new Error(`Unexpected Grab text URL: ${url}`)
      },
    }),
    /no longer exposes normalized india jobs/i,
  )
})
