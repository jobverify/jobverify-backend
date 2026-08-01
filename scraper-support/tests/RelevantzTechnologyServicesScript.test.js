import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T00:00:00.000Z'

const VERIFIED_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Relevantz | Join Our Digital Engineering & AI Innovation Team</title>
  </head>
  <body>
    <h1>Join us to create relevant solutions for customers that improve lives</h1>
    <h2>Careers US</h2>
    <p>Type: Full-time | Location: Alpharetta, GA</p>
    <h2>Careers India</h2>
    <p>Java Full stack Developer</p>
    <p>APPLY NOW</p>
    <p>Job Title: Java Full stack Developer</p>
    <p>Location: Pune/Chennai</p>
    <p>Position Type: Permanent</p>
    <p>Experience: 5+ Years</p>
    <p>Skillsets Required : Core Java, Spring boot, Microservices, Any Messaging Queue, Angular</p>
    <ul>
      <li>Developer with Java Full Stack skills with Angular Development.</li>
      <li>Experience using Java 8 or higher versions, Angular 8, Spring, Spring Boot, RESTful web services, JMS/Kafka.</li>
    </ul>
    <p>APPLY NOW</p>
    <p>Data Architect</p>
    <p>APPLY NOW</p>
    <p>Job Title: Data Architect</p>
    <p>Location: Chennai</p>
    <p>Experience: 13+ Years</p>
    <p>Position Type: Fulltime</p>
    <p>Skillsets Required: Data Architecture, AWS/GCP/Azure, Data Lake, ETL, SQL, Snowflake.</p>
    <p>Job Summary:</p>
    <p>We are seeking an experienced Data Architect to design, develop, and optimize our enterprise data architecture.</p>
    <p>Required Skills & Qualifications</p>
    <ul>
      <li>Strong knowledge of SQL, ETL processes, and cloud platforms (AWS, Azure, GCP).</li>
      <li>Familiarity with Big Data technologies and data governance frameworks.</li>
    </ul>
    <p>APPLY NOW</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/relevantztechnologyservices/script.js')
  } catch {
    assert.fail('Expected Relevantz Technology Services scraper module at ../../scraper/relevantztechnologyservices/script.js')
  }
}

test('Relevantz Technology Services extracts India openings from the verified first-party careers page', async () => {
  const relevantz = await loadModule()

  assert.equal(relevantz.SOURCE, 'relevantztechnologyservices')
  assert.equal(relevantz.COMPANY, 'Relevantz Technology Services')
  assert.equal(relevantz.CAREERS_URL, 'https://relevantz.com/careers/')
  assert.equal(relevantz.hasOfficialCareersSignal(VERIFIED_CAREERS_HTML), true)

  const jobs = relevantz.extractIndiaJobs(VERIFIED_CAREERS_HTML)
  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      city: job.city,
      employmentType: job.employmentType,
      experienceRequired: job.experienceRequired,
    })),
    [
      {
        title: 'Java Full stack Developer',
        location: 'Pune/Chennai',
        city: 'Pune',
        employmentType: 'Permanent',
        experienceRequired: '5+ Years',
      },
      {
        title: 'Data Architect',
        location: 'Chennai',
        city: 'Chennai',
        employmentType: 'Full-time',
        experienceRequired: '13+ Years',
      },
    ],
  )
  assert.ok(jobs[0].requiredSkills.includes('Core Java'))
  assert.match(jobs[0].jobDescription, /Angular Development/i)
  assert.match(jobs[1].jobDescription, /enterprise data architecture/i)
})

test('Relevantz Technology Services run returns India openings in the shared job shape', async () => {
  const relevantz = await loadModule()
  const jobs = await relevantz.createRelevantzTechnologyServicesScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      assert.equal(url, relevantz.CAREERS_URL)
      return VERIFIED_CAREERS_HTML
    },
  })

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'relevantztechnologyservices')
  assert.equal(jobs[0].company, 'Relevantz Technology Services')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].applyUrl, relevantz.CAREERS_URL)
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})

test('Relevantz Technology Services fails closed when the verified careers page drifts or the India section disappears', async () => {
  const relevantz = await loadModule()

  await assert.rejects(
    relevantz.createRelevantzTechnologyServicesScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified Relevantz Technology Services careers page/i,
  )

  await assert.rejects(
    relevantz.createRelevantzTechnologyServicesScraper().run({
      fetchText: async () => `
        <html>
          <head><title>Careers at Relevantz | Join Our Digital Engineering & AI Innovation Team</title></head>
          <body>
            <h1>Join us to create relevant solutions for customers that improve lives</h1>
            <h2>Careers India</h2>
            <p>Java Full stack Developer</p>
            <p>Data Architect</p>
          </body>
        </html>
      `,
    }),
    /india openings/i,
  )
})
