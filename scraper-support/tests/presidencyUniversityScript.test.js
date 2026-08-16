import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers</title>
  </head>
  <body>
    <h1>Presidency University</h1>
    <p>At Presidency University we are committed to building a workplace where educators and administrators can do their best work.</p>
    <h2>Current Vacancies</h2>
    <div class="vacancy-boxes-wrap">
      <div class="vacancy-boxes">
        <div class="vacancy-box-top">
          <h4>Dean - Research</h4>
          <div class="vacancy-box-icon"><p>Job function: Administrative</p></div>
          <div class="vacancy-box-icon"><p>Experience: 10 - 15 Years</p></div>
          <div class="vacancy-box-icon"><p>Job location: Bengaluru</p></div>
        </div>
        <div class="vacancy-box-bottom">
          <a href="https://career.hrone.cloud/apply-job?appId=app-1&amp;dc=presidency&amp;rqt=req-1&amp;cc=cc-1&amp;pid=pid-1" target="_blank" rel="noopener">
            Apply Now
          </a>
        </div>
      </div>
      <div class="vacancy-boxes">
        <div class="vacancy-box-top">
          <h4>School Of Liberal Arts &amp; Sciences</h4>
          <div class="vacancy-box-icon"><p>Job function: Education</p></div>
          <div class="vacancy-box-icon"><p>Experience: 0 - 8 Years</p></div>
          <div class="vacancy-box-icon"><p>Number of openings: 2</p></div>
        </div>
        <div class="vacancy-box-bottom">
          <a href="https://career.hrone.cloud/apply-job?appId=app-1&amp;dc=presidency&amp;rqt=req-1&amp;cc=cc-1&amp;pid=pid-2" target="_blank" rel="noopener">
            Apply Now
          </a>
        </div>
      </div>
    </div>
    <div class="text-center mt-5 mb-lg-4 pb-5">
      <a href="https://hr-1.in/b42a6e" class="new_design_btn" target="_blank" rel="noopener">See All Vacancies</a>
    </div>
  </body>
</html>
`

const loadPresidencyModule = async () => {
  try {
    return await import('../../scraper/presidencyuniversity/script.js')
  } catch {
    assert.fail('Expected Presidency University scraper module at ../../scraper/presidencyuniversity/script.js')
  }
}

test('Presidency University extracts live-shape vacancy-boxes cards with HTML-encoded HROne apply links', async () => {
  const presidency = await loadPresidencyModule()
  const cards = presidency.extractVacancyCards(careersHtml)
  const jobs = presidency.extractHrOneJobs(cards)

  assert.equal(presidency.CAREERS_URL, 'https://presidencyuniversity.in/careers')
  assert.equal(presidency.HRONE_VACANCIES_URL, 'https://hr-1.in/b42a6e')
  assert.equal(presidency.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(presidency.extractVacanciesBoardUrl(careersHtml), presidency.HRONE_VACANCIES_URL)
  assert.equal(cards.length, 2)
  assert.deepEqual(cards.map((card) => card.applyUrl), [
    'https://career.hrone.cloud/apply-job?appId=app-1&dc=presidency&rqt=req-1&cc=cc-1&pid=pid-1',
    'https://career.hrone.cloud/apply-job?appId=app-1&dc=presidency&rqt=req-1&cc=cc-1&pid=pid-2',
  ])
  assert.deepEqual(jobs.map((job) => ({
    title: job.title,
    jobId: job.jobId,
    department: job.department,
    location: job.location,
    experienceRequired: job.experienceRequired,
  })), [
    {
      title: 'Dean - Research',
      jobId: 'pid-1',
      department: 'Administrative',
      location: 'Bengaluru, India',
      experienceRequired: '10 - 15 Years',
    },
    {
      title: 'School Of Liberal Arts & Sciences',
      jobId: 'pid-2',
      department: 'Education',
      location: null,
      experienceRequired: '0 - 8 Years',
    },
  ])
})

test('Presidency University run returns trusted HROne-backed jobs from the inline careers page cards', async () => {
  const presidency = await loadPresidencyModule()
  const requestedUrls = []

  const jobs = await presidency.createPresidencyUniversityScraper().run({
    now: () => '2026-08-14T00:00:00.000Z',
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === presidency.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected Presidency University URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [presidency.CAREERS_URL])
  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs.map((job) => ({
    title: job.title,
    source: job.source,
    link: job.link,
    scrapedAt: job.scrapedAt,
  })), [
    {
      title: 'Dean - Research',
      source: 'presidencyuniversity',
      link: 'https://career.hrone.cloud/apply-job?appId=app-1&dc=presidency&rqt=req-1&cc=cc-1&pid=pid-1',
      scrapedAt: '2026-08-14T00:00:00.000Z',
    },
    {
      title: 'School Of Liberal Arts & Sciences',
      source: 'presidencyuniversity',
      link: 'https://career.hrone.cloud/apply-job?appId=app-1&dc=presidency&rqt=req-1&cc=cc-1&pid=pid-2',
      scrapedAt: '2026-08-14T00:00:00.000Z',
    },
  ])
})

test('Presidency University still fails closed when the trusted inline vacancy cards disappear', async () => {
  const presidency = await loadPresidencyModule()

  await assert.rejects(
    presidency.createPresidencyUniversityScraper().run({
      fetchText: async () => careersHtml.replaceAll('vacancy-boxes', 'vacancy-cards'),
    }),
    /trusted inline vacancy cards/i,
  )
})
