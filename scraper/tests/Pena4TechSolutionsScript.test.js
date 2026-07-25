import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../pena4techsolutions/script.js')
  } catch {
    assert.fail('Expected Pena4 Tech Solutions scraper module at ../pena4techsolutions/script.js')
  }
}

const jobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs at Pena4 | Join Our Team</title>
  </head>
  <body>
    <main>
      <h1>Jobs</h1>
      <h2>Submit your resume and become a part of our team</h2>
      <ul class="regions">
        <li>U.S.A</li>
        <li>Canada</li>
        <li>India</li>
      </ul>
      <a href="https://www.indeed.com/jobs?q=Pena4">View jobs on indeed</a>
      <a href="https://www.linkedin.com/company/pena4/jobs/">View jobs on linkedin</a>

      <section class="job-card">
        <h3>Inpatient Medical Coder</h3>
        <p>Submit Your Resume Now!</p>
        <p>Description: Seeking experienced Inpatient Medical Coders. Positions are 100% remote. Both full time and part time positions are available.</p>
        <ul>
          <li>Start: Immediately</li>
          <li>Pay: 1099 assignments</li>
        </ul>
      </section>

      <p>Currently, there are no job openings available in this location. Please check back later or explore opportunities in other regions.</p>

      <section>
        <h2>Job Application Form</h2>
        <form action="/jobs.php" method="post">
          <input type="text" name="name" />
          <button type="submit">Apply Now</button>
        </form>
      </section>
    </main>
  </body>
</html>
`

test('Pena4 Tech Solutions validates the verified first-party jobs page and extracts India-facing openings', async () => {
  const pena4 = await loadModule()

  assert.equal(pena4.hasOfficialJobsPageSignal(jobsHtml), true)

  assert.deepEqual(pena4.extractJobCards(jobsHtml), [
    {
      title: 'Inpatient Medical Coder',
      location: 'India',
      employmentType: 'Full Time or Part Time',
      remoteType: 'Remote',
      sourceUrl: 'https://www.pena4.com/jobs.php',
      applyUrl: 'https://www.pena4.com/jobs.php',
      jobDescription: 'Seeking experienced Inpatient Medical Coders. Positions are 100% remote. Both full time and part time positions are available.',
    },
  ])
})

test('Pena4 Tech Solutions run returns normalized jobs from the verified first-party jobs page', async () => {
  const pena4 = await loadModule()
  const jobs = await pena4.run({
    fetchText: async (url) => {
      assert.equal(url, pena4.JOBS_URL)
      return jobsHtml
    },
    now: () => '2026-07-17T00:00:00.000Z',
  })

  assert.deepEqual(jobs, [
    {
      title: 'Inpatient Medical Coder',
      company: 'Pena4 Tech Solutions',
      location: 'India',
      country: 'India',
      employmentType: 'Full Time or Part Time',
      remoteType: 'Remote',
      sourceUrl: 'https://www.pena4.com/jobs.php',
      applyUrl: 'https://www.pena4.com/jobs.php',
      link: 'https://www.pena4.com/jobs.php',
      jobDescription: 'Seeking experienced Inpatient Medical Coders. Positions are 100% remote. Both full time and part time positions are available.',
      source: 'pena4techsolutions',
      scrapedAt: '2026-07-17T00:00:00.000Z',
    },
  ])
})

test('Pena4 Tech Solutions fails closed when the verified jobs page drifts', async () => {
  const pena4 = await loadModule()

  await assert.rejects(
    pena4.run({
      fetchText: async () => '<html><body><h1>Contact us</h1></body></html>',
    }),
    /verified first-party jobs page/i,
  )
})
