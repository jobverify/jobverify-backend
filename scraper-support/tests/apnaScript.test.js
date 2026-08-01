import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-15T00:00:00.000Z'

const careersPage = {
  status: 200,
  url: 'https://careers.apna.co/',
  html: `
    <!doctype html>
    <html lang="en">
      <head>
        <title>Apna - Current Openings</title>
        <link rel="canonical" href="https://careers.apna.co">
        <meta name="hasCustomDomain" content="true">
        <meta name="description" content="Join the largest homegrown jobs and professional networking platform in India.">
        <link rel="alternate" hreflang="en" href="https://apply.workable.com/apna/?lng=en">
      </head>
      <body>
        <main>
          <h1>Apna - Current Openings</h1>
          <script>window.careers = {"company":"Apna"}</script>
        </main>
      </body>
    </html>
  `,
}

const jobsMarkdown = `# Apna — All Open Positions

> Last updated: 2026-07-14

| Title | Department | Location | Type | Salary | Posted | Details |
| --- | --- | --- | --- | --- | --- | --- |
| Product Analyst | Product & Design | Bengaluru, India | Full-time | — | 2026-07-13 | [View](https://apply.workable.com/apna/jobs/view/95D6F2526C.md) |
| Business Development Manager- Field Sales | Sales & Account Management | Kochi, India (Hybrid) | Full-time | INR 700,000–1,000,000 | 2026-07-10 | [View](https://apply.workable.com/apna/jobs/view/BB90C6B417.md) |
| Business Development Manager \\| Consultant POD \\| Kolkata | Sales & Account Management | Kolkata, India | Full-time | INR 600,000–900,000 | 2026-06-22 | [View](https://apply.workable.com/apna/jobs/view/0A08B6DC81.md) |
| Staff Product Manager | Product & Design | San Francisco, United States | Full-time | — | 2026-07-01 | [View](https://apply.workable.com/apna/jobs/view/USROLE1234.md) |
`

const invalidJobsMarkdown = `# Apna — Open Positions

- [Product Analyst](https://apply.workable.com/apna/j/95D6F2526C/) - Bengaluru, India
`

const loadModule = async () => {
  try {
    return await import('../../scraper/apna/script.js')
  } catch {
    assert.fail('Expected Apna scraper module at ../../scraper/apna/script.js')
  }
}

test('Apna constants and parsers stay pinned to the verified first-party careers handoff and public jobs feed', async () => {
  const apna = await loadModule()

  assert.equal(apna.COMPANY_NAME, 'Apna')
  assert.equal(apna.SOURCE, 'apna')
  assert.equal(apna.COUNTRY_FILTER, 'India')
  assert.equal(apna.HOMEPAGE_URL, 'https://apna.co/')
  assert.equal(apna.CAREERS_ENTRY_URL, 'https://apna.co/careers')
  assert.equal(apna.CAREERS_URL, 'https://careers.apna.co/')
  assert.equal(
    apna.JOBS_FEED_URL,
    'https://careers.apna.co/jobs.md?location[0][country]=India',
  )
  assert.equal(apna.VERIFIED_JOB_URL, 'https://careers.apna.co/_/j/95D6F2526C')
  assert.equal(apna.hasOfficialCareersSignal(careersPage), true)
  assert.equal(apna.hasOfficialJobsFeedSignal(jobsMarkdown), true)

  const jobs = apna.extractJobsFromMarkdown(jobsMarkdown)
  assert.deepEqual(jobs, [
    {
      title: 'Product Analyst',
      company: 'Apna',
      department: 'Product & Design',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      state: null,
      country: 'India',
      jobId: '95D6F2526C',
      requisitionId: '95D6F2526C',
      sourceUrl: 'https://careers.apna.co/_/j/95D6F2526C',
      applyUrl: 'https://careers.apna.co/_/j/95D6F2526C/apply',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-13',
      closingDate: null,
      jobDescription: null,
    },
    {
      title: 'Business Development Manager- Field Sales',
      company: 'Apna',
      department: 'Sales & Account Management',
      location: 'Kochi, India (Hybrid)',
      city: 'Kochi',
      state: null,
      country: 'India',
      jobId: 'BB90C6B417',
      requisitionId: 'BB90C6B417',
      sourceUrl: 'https://careers.apna.co/_/j/BB90C6B417',
      applyUrl: 'https://careers.apna.co/_/j/BB90C6B417/apply',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-10',
      closingDate: null,
      jobDescription: null,
    },
    {
      title: 'Business Development Manager | Consultant POD | Kolkata',
      company: 'Apna',
      department: 'Sales & Account Management',
      location: 'Kolkata, India',
      city: 'Kolkata',
      state: null,
      country: 'India',
      jobId: '0A08B6DC81',
      requisitionId: '0A08B6DC81',
      sourceUrl: 'https://careers.apna.co/_/j/0A08B6DC81',
      applyUrl: 'https://careers.apna.co/_/j/0A08B6DC81/apply',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-06-22',
      closingDate: null,
      jobDescription: null,
    },
  ])
})

test('run validates the verified careers handoff, parses the country-filtered markdown feed, and decorates Apna jobs', async () => {
  const apna = await loadModule()
  const requestedUrls = []

  const jobs = await apna.createApnaScraper({ maxJobs: 2 }).run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === apna.CAREERS_ENTRY_URL) return careersPage

      throw new Error(`Unexpected Apna page URL: ${url}`)
    },
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === apna.JOBS_FEED_URL) return jobsMarkdown

      throw new Error(`Unexpected Apna feed URL: ${url}`)
    },
    now: () => FIXED_SCRAPED_AT,
  })

  assert.deepEqual(requestedUrls, [
    apna.CAREERS_ENTRY_URL,
    apna.JOBS_FEED_URL,
  ])
  assert.deepEqual(jobs, [
    {
      title: 'Product Analyst',
      company: 'Apna',
      department: 'Product & Design',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      state: null,
      country: 'India',
      jobId: '95D6F2526C',
      requisitionId: '95D6F2526C',
      sourceUrl: 'https://careers.apna.co/_/j/95D6F2526C',
      applyUrl: 'https://careers.apna.co/_/j/95D6F2526C/apply',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-13',
      closingDate: null,
      jobDescription: null,
      source: 'apna',
      link: 'https://careers.apna.co/_/j/95D6F2526C/apply',
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Business Development Manager- Field Sales',
      company: 'Apna',
      department: 'Sales & Account Management',
      location: 'Kochi, India (Hybrid)',
      city: 'Kochi',
      state: null,
      country: 'India',
      jobId: 'BB90C6B417',
      requisitionId: 'BB90C6B417',
      sourceUrl: 'https://careers.apna.co/_/j/BB90C6B417',
      applyUrl: 'https://careers.apna.co/_/j/BB90C6B417/apply',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-10',
      closingDate: null,
      jobDescription: null,
      source: 'apna',
      link: 'https://careers.apna.co/_/j/BB90C6B417/apply',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Apna scraper fails closed when the verified careers handoff or markdown jobs feed drifts', async () => {
  const apna = await loadModule()

  await assert.rejects(
    apna.createApnaScraper().run({
      fetchPage: async () => ({
        ...careersPage,
        url: 'https://jobs.example.com/apna',
      }),
    }),
    /verified official careers handoff/i,
  )

  await assert.rejects(
    apna.createApnaScraper().run({
      fetchPage: async () => careersPage,
      fetchText: async () => invalidJobsMarkdown,
    }),
    /verified jobs feed/i,
  )
})
