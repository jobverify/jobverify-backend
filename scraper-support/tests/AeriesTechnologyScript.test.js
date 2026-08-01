import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T00:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Aeries Technology</title>
  </head>
  <body>
    <h1>Careers</h1>
    <p>View Current Openings</p>
    <a href="https://aeriestechnology.talentrecruit.com/Default.aspx">View Current Openings</a>
  </body>
</html>
`

const boardHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Browse All Jobs 1 - 3 of 3 Jobs</h1>
    <div class="job-card">
      <a class="job-link" href="Search/Jobs/?3278-Treasury-Analyst" title="Treasury Analyst">Treasury Analyst</a>
      <span class="job-location">Mumbai</span>
      <span class="job-department">Finance</span>
    </div>
    <div class="job-card">
      <a class="job-link" href="Search/Jobs/?3279-Associate-Security-Analyst" title="Associate Security Analyst">Associate Security Analyst</a>
      <span class="job-location">Pune</span>
      <span class="job-department">Security</span>
    </div>
    <div class="job-card">
      <a class="job-link" href="Search/Jobs/?3280-US-Account-Manager" title="US Account Manager">US Account Manager</a>
      <span class="job-location">Dallas, United States</span>
      <span class="job-department">Sales</span>
    </div>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/aeriestechnology/script.js')
  } catch {
    assert.fail('Expected Aeries Technology scraper module at ../../scraper/aeriestechnology/script.js')
  }
}

test('Aeries Technology validates the verified TalentRecruit surface and keeps India listings', async () => {
  const aeries = await loadModule()

  assert.equal(aeries.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(aeries.extractJobsBoardUrl(careersHtml), aeries.JOBS_BOARD_URL)
  assert.equal(aeries.hasJobsBoardSignal(boardHtml), true)

  const jobs = await aeries.createAeriesTechnologyScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      if (url === aeries.CAREERS_URL) return careersHtml
      if (url === aeries.JOBS_BOARD_URL) return boardHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [
    {
      title: 'Treasury Analyst',
      company: 'Aeries Technology',
      department: 'Finance',
      location: 'Mumbai, India',
      city: 'Mumbai',
      country: 'India',
      jobId: '3278',
      requisitionId: '3278',
      sourceUrl: 'https://aeriestechnology.talentrecruit.com/Search/Jobs/?3278-Treasury-Analyst',
      applyUrl: 'https://aeriestechnology.talentrecruit.com/Search/Jobs/?3278-Treasury-Analyst',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      source: 'aeriestechnology',
      companyCareerPage: 'https://aeriestechnology.com/careers/',
      companyDomain: 'aeriestechnology.com',
      atsPlatform: 'talentrecruit',
      link: 'https://aeriestechnology.talentrecruit.com/Search/Jobs/?3278-Treasury-Analyst',
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Associate Security Analyst',
      company: 'Aeries Technology',
      department: 'Security',
      location: 'Pune, India',
      city: 'Pune',
      country: 'India',
      jobId: '3279',
      requisitionId: '3279',
      sourceUrl: 'https://aeriestechnology.talentrecruit.com/Search/Jobs/?3279-Associate-Security-Analyst',
      applyUrl: 'https://aeriestechnology.talentrecruit.com/Search/Jobs/?3279-Associate-Security-Analyst',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      source: 'aeriestechnology',
      companyCareerPage: 'https://aeriestechnology.com/careers/',
      companyDomain: 'aeriestechnology.com',
      atsPlatform: 'talentrecruit',
      link: 'https://aeriestechnology.talentrecruit.com/Search/Jobs/?3279-Associate-Security-Analyst',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Aeries Technology fails closed when the trusted public board changes materially', async () => {
  const aeries = await loadModule()

  await assert.rejects(
    aeries.createAeriesTechnologyScraper().run({
      fetchText: async (url) => {
        if (url === aeries.CAREERS_URL) return careersHtml
        return '<html><body>No job rows here</body></html>'
      },
    }),
    /trusted public jobs surface/i,
  )
})
