import assert from 'node:assert/strict'
import test from 'node:test'

const loadPersevexModule = async () => {
  try {
    return await import('../../scraper/persevex/script.js')
  } catch {
    assert.fail('Expected Persevex scraper module at ../../scraper/persevex/script.js')
  }
}

const officialHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Persevex | Persevex</title>
  </head>
  <body>
    <a href="/careers">Careers</a>
    <p>Campus Ambassador</p>
    <p>Job Clox</p>
    <p>Persevex LMS</p>
  </body>
</html>
`

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Persevex | Persevex</title>
  </head>
  <body>
    <h1>Join the team</h1>
    <p>Help students launch careers</p>
    <p>Build yours here</p>
    <section id="open-roles">
      <h2>Open Positions</h2>
      <p>Apply in under a minute</p>
      <p>Showing <span>2</span> role</p>
      <div class="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <button class="w-full text-left">
          <h3 class="text-lg font-bold text-foreground">Business Development Executive</h3>
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <span>Full-time</span>
            <span>Growth</span>
          </div>
          <div class="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Hybrid (Bangalore / India)</span>
            <span>Full-time</span>
            <span>₹4 LPA</span>
          </div>
        </button>
      </div>
      <div class="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <button class="w-full text-left">
          <h3 class="text-lg font-bold text-foreground">Placement Executive</h3>
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <span>Full-time</span>
            <span>Careers</span>
          </div>
          <div class="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Remote</span>
            <span>Full-time</span>
            <span>₹3.5 LPA</span>
          </div>
        </button>
      </div>
      <p>Don't see your role</p>
    </section>
  </body>
</html>
`

test('Persevex validates the verified careers surface and marks public role cards as checked', async () => {
  const persevex = await loadPersevexModule()

  assert.equal(persevex.SOURCE, 'persevex')
  assert.equal(persevex.hasOfficialHomepageSignal(officialHomepageHtml), true)
  assert.equal(persevex.hasOfficialCareersSignal(officialCareersHtml), true)

  const jobs = persevex.extractPublicJobs(officialCareersHtml)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Business Development Executive',
    company: 'Persevex',
    department: 'Growth',
    location: 'Hybrid (Bangalore / India)',
    city: 'Bangalore',
    state: null,
    country: 'India',
    jobId: 'persevex-business-development-executive-growth-hybrid-bangalore-india',
    requisitionId: 'persevex-business-development-executive-growth-hybrid-bangalore-india',
    sourceUrl: persevex.CAREERS_URL,
    applyUrl: persevex.CAREERS_URL,
    employmentType: 'Full-time',
    workplaceType: 'Hybrid',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Official Persevex opening listed on the first-party careers page. Department: Growth. Location: Hybrid (Bangalore / India). Work type: Full-time. Compensation: ₹4 LPA.',
    publicExperienceChecked: true,
    remoteStatus: 'Hybrid',
  })
  assert.ok(jobs.every((job) => job.publicExperienceChecked === true))
})

test('Persevex run decorates verified public jobs with shared metadata', async () => {
  const persevex = await loadPersevexModule()
  const requestedUrls = []

  const jobs = await persevex.createPersevexScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === persevex.HOMEPAGE_URL) return officialHomepageHtml
      if (url === persevex.CAREERS_URL) return officialCareersHtml
      throw new Error(`Unexpected Persevex URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [persevex.HOMEPAGE_URL, persevex.CAREERS_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, persevex.SOURCE)
  assert.equal(jobs[0].companyCareerPage, persevex.CAREERS_URL)
  assert.ok(typeof jobs[0].scrapedAt === 'string')
  assert.ok(jobs.every((job) => job.publicExperienceChecked === true))
})
