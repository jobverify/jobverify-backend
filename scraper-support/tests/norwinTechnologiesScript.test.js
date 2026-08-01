import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Join the Elite Technical Bench.</h1>
    <p>Not Just a Job. A Technical Career Built to Last.</p>
    <p>Great Place To Work, India</p>
  </body>
</html>
`

const boardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Norwin Technologies jobs</title>
  </head>
  <body>
    <h1>Jobs at Norwin Technologies</h1>
    <a href="https://norwin.hire.trakstar.com/jobs/fk0india1/">Principal Engineer</a>
    <div>Bengaluru, Karnataka, India</div>
    <a href="https://norwin.hire.trakstar.com/jobs/fk0us1/">Sr, Storage Ops</a>
    <div>Atlanta, GA, United States</div>
  </body>
</html>
`

const indiaDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Principal Engineer</h1>
    <p>Job Description</p>
    <section class="job-description">
      <p>Build and operate enterprise storage and infrastructure systems for India delivery teams.</p>
    </section>
    <p>Department: Engineering</p>
    <p>Location: Bengaluru, Karnataka, India</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/norwintechnologies/script.js')
  } catch {
    assert.fail('Expected Norwin Technologies scraper module at ../../scraper/norwintechnologies/script.js')
  }
}

test('Norwin Technologies validates the careers page and extracts Trakstar job listings', async () => {
  const norwin = await loadModule()

  assert.equal(norwin.CAREERS_URL, 'https://norwintechnologies.com/careers/')
  assert.equal(norwin.BOARD_URL, 'https://norwin.hire.trakstar.com/')
  assert.equal(norwin.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(norwin.hasVerifiedTrakstarBoardSignal(boardHtml), true)
  assert.deepEqual(
    norwin.extractTrakstarListings(boardHtml).map((job) => [job.title, job.location, job.jobId]),
    [
      ['Principal Engineer', 'Bengaluru, Karnataka, India', 'fk0india1'],
      ['Sr, Storage Ops', 'Atlanta, GA, United States', 'fk0us1'],
    ],
  )
})

test('Norwin Technologies run keeps only India roles from the verified Trakstar board', async () => {
  const norwin = await loadModule()
  const requestedUrls = []

  const jobs = await norwin.createNorwinTechnologiesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === norwin.CAREERS_URL) return careersHtml
      if (url === norwin.BOARD_URL) return boardHtml
      if (url === 'https://norwin.hire.trakstar.com/jobs/fk0india1/') return indiaDetailHtml
      throw new Error(`Unexpected Norwin URL: ${url}`)
    },
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    norwin.CAREERS_URL,
    norwin.BOARD_URL,
    'https://norwin.hire.trakstar.com/jobs/fk0india1/',
  ])
  assert.deepEqual(
    jobs.map((job) => [job.title, job.location, job.department, job.country, job.source]),
    [['Principal Engineer', 'Bengaluru, Karnataka, India', 'Engineering', 'India', 'norwintechnologies']],
  )
})

test('Norwin Technologies fails closed when the verified board contract drifts', async () => {
  const norwin = await loadModule()

  await assert.rejects(
    norwin.createNorwinTechnologiesScraper().run({
      fetchText: async (url) => {
        if (url === norwin.CAREERS_URL) return careersHtml
        return boardHtml.replace('Jobs at Norwin Technologies', 'Jobs elsewhere')
      },
    }),
    /verified Trakstar board/i,
  )
})
