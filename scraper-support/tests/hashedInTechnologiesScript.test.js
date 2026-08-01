import assert from 'node:assert/strict'
import test from 'node:test'

const loadHashedInModule = async () => {
  try {
    return await import('../../scraper/hashedintechnologies/script.js')
  } catch {
    assert.fail('Expected HashedIn Technologies scraper module at ../../scraper/hashedintechnologies/script.js')
  }
}

const homepageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <header>
      <a class="header-nav-link" href="/about-us">About Us</a>
      <a class="header-nav-link" href="/careers">Careers</a>
      <a class="header-nav-link" href="/insights">Insights</a>
    </header>
    <section>
      <h2>What impact will you make?</h2>
      <a href="/careers">Open Positions</a>
    </section>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main id="main-content" class="min-h-screen">
      <div class="careers-page">
        <section class="careers-hero-section">
          <h1>What Impact Will You Make?</h1>
          <button type="button" class="primary-button careers-hero-button">
            <span class="primary-button__text">See Current Job Openings</span>
          </button>
        </section>
        <section class="explore-opportunities-section" id="explore-opportunities">
          <h2 class="heading-secondary">Your Next Adventure Starts Here</h2>
        </section>
      </div>
      <script>
        class CareersDataService {
          async getExperiencedJobs() { return this.loadJsonFile("/data/careers/experiencedJobs.json") }
          async getFresherJobs() { return this.loadJsonFile("/data/careers/fresherJobs.json") }
        }
      </script>
    </main>
  </body>
</html>
`

const experiencedJobsJson = JSON.stringify([
  {
    id: 'tech-architect',
    title: 'Sr. Technology Architect',
    experience: '9-18 years of experience',
    description: 'Hands on experience with Java/Python/UI/DE.',
    location: 'Bengaluru/Gurugram/Hyderabad/Pune/Chennai/Mumbai/Kolkata',
    detailedJdUrl: 'https://apply.hashedin.com/caf/?source=Careers%20Page&jobTitle=Tech%20Architect&tenant_id=MTEyMg==',
    status: 'active',
    lastUpdated: '2025-10-01',
  },
  {
    id: 'inactive-role',
    title: 'Inactive Role',
    experience: '1-2 years of experience',
    description: 'Should not be emitted.',
    location: 'Bengaluru',
    detailedJdUrl: 'https://apply.hashedin.com/caf/?source=Careers%20Page&jobTitle=Inactive&tenant_id=MTEyMg==',
    status: 'inactive',
    lastUpdated: '2025-01-01',
  },
])

const fresherJobsJson = JSON.stringify([
  {
    id: 'graduate-engineer-trainee',
    title: 'Graduate Engineer Trainee',
    experience: '0-1 years of experience',
    description: 'Strong fundamentals in computer science and cloud.',
    location: 'Bengaluru/Hyderabad',
    detailedJdUrl: 'https://apply.hashedin.com/caf/?source=Careers%20Page&jobTitle=Graduate%20Engineer%20Trainee&tenant_id=MTEyMg==',
    status: 'active',
    lastUpdated: '2025-08-15',
  },
])

test('HashedIn Technologies validates the official careers shell and maps first-party JSON jobs into shared fields', async () => {
  const hashedIn = await loadHashedInModule()

  assert.equal(hashedIn.SOURCE, 'hashedintechnologies')
  assert.equal(hashedIn.COMPANY, 'HashedIn Technologies')
  assert.equal(hashedIn.HOMEPAGE_URL, 'https://www.hashedin.com/')
  assert.equal(hashedIn.CAREERS_URL, 'https://www.hashedin.com/careers/')
  assert.equal(hashedIn.EXPERIENCED_JOBS_URL, 'https://www.hashedin.com/data/careers/experiencedJobs.json')
  assert.equal(hashedIn.FRESHER_JOBS_URL, 'https://www.hashedin.com/data/careers/fresherJobs.json')
  assert.equal(typeof hashedIn.hasOfficialHomepageSignal, 'function')
  assert.equal(typeof hashedIn.hasOfficialCareersSignal, 'function')
  assert.equal(typeof hashedIn.extractJobsFromFeed, 'function')
  assert.equal(typeof hashedIn.createHashedInTechnologiesScraper, 'function')
  assert.equal(typeof hashedIn.run, 'function')

  assert.equal(hashedIn.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hashedIn.hasOfficialCareersSignal(careersHtml), true)

  assert.deepEqual(hashedIn.extractJobsFromFeed(JSON.parse(experiencedJobsJson), 'experienced'), [
    {
      title: 'Sr. Technology Architect',
      company: 'HashedIn Technologies',
      department: 'Experienced',
      location: 'Bengaluru, Gurugram, Hyderabad, Pune, Chennai, Mumbai, Kolkata, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: 'tech-architect',
      requisitionId: 'tech-architect',
      sourceUrl: 'https://apply.hashedin.com/caf/?source=Careers%20Page&jobTitle=Tech%20Architect&tenant_id=MTEyMg==',
      applyUrl: 'https://apply.hashedin.com/caf/?source=Careers%20Page&jobTitle=Tech%20Architect&tenant_id=MTEyMg==',
      employmentType: null,
      experienceRequired: '9-18 years of experience',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2025-10-01',
      closingDate: null,
      jobDescription: 'Hands on experience with Java/Python/UI/DE.',
      remoteStatus: 'On-site',
    },
  ])

  assert.deepEqual(hashedIn.extractJobsFromFeed(JSON.parse(fresherJobsJson), 'fresher'), [
    {
      title: 'Graduate Engineer Trainee',
      company: 'HashedIn Technologies',
      department: 'Fresher',
      location: 'Bengaluru, Hyderabad, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: 'graduate-engineer-trainee',
      requisitionId: 'graduate-engineer-trainee',
      sourceUrl: 'https://apply.hashedin.com/caf/?source=Careers%20Page&jobTitle=Graduate%20Engineer%20Trainee&tenant_id=MTEyMg==',
      applyUrl: 'https://apply.hashedin.com/caf/?source=Careers%20Page&jobTitle=Graduate%20Engineer%20Trainee&tenant_id=MTEyMg==',
      employmentType: null,
      experienceRequired: '0-1 years of experience',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2025-08-15',
      closingDate: null,
      jobDescription: 'Strong fundamentals in computer science and cloud.',
      remoteStatus: 'On-site',
    },
  ])
})

test('run verifies the official homepage and careers page, then fetches the first-party JSON feeds only', async () => {
  const hashedIn = await loadHashedInModule()
  const requestedUrls = []

  const jobs = await hashedIn.createHashedInTechnologiesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === hashedIn.HOMEPAGE_URL) return homepageHtml
      if (url === hashedIn.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)
      if (url === hashedIn.EXPERIENCED_JOBS_URL) return JSON.parse(experiencedJobsJson)
      if (url === hashedIn.FRESHER_JOBS_URL) return JSON.parse(fresherJobsJson)
      throw new Error(`Unexpected JSON URL: ${url}`)
    },
    now: () => '2026-07-10T08:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    'https://www.hashedin.com/',
    'https://www.hashedin.com/careers/',
    'https://www.hashedin.com/data/careers/experiencedJobs.json',
    'https://www.hashedin.com/data/careers/fresherJobs.json',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'hashedintechnologies')
  assert.equal(jobs[0].link, 'https://apply.hashedin.com/caf/?source=Careers%20Page&jobTitle=Tech%20Architect&tenant_id=MTEyMg==')
  assert.equal(jobs[0].scrapedAt, '2026-07-10T08:00:00.000Z')
})

test('HashedIn Technologies fails closed when the verified careers surface changes materially', async () => {
  const hashedIn = await loadHashedInModule()

  await assert.rejects(
    hashedIn.createHashedInTechnologiesScraper().run({
      fetchText: async (url) => {
        if (url === hashedIn.HOMEPAGE_URL) return homepageHtml
        return '<html><body><h1>Careers</h1></body></html>'
      },
      fetchJson: async () => [],
    }),
    /HashedIn Technologies official careers surface changed/i,
  )
})

