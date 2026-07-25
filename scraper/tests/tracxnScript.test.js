import assert from 'node:assert/strict'
import test from 'node:test'

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <section>
        <p>Careers at Tracxn</p>
        <article class="opening-card">
          <a href="/career/data-scientist">
            <h3>Data Scientist</h3>
          </a>
          <p>Analytics</p>
          <p>Bengaluru, India</p>
        </article>
        <article class="opening-card">
          <a href="/career/sde-backend">
            <h3>SDE - Backend</h3>
          </a>
          <p>Engineering</p>
          <p>Bengaluru / Remote, India</p>
        </article>
      </section>
    </main>
  </body>
</html>
`

const DATA_SCIENTIST_DETAIL_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Data Scientist</h1>
      <p>Department: Analytics</p>
      <p>Location: Bengaluru, India</p>
      <p>Employment Type: Full-time</p>
      <section>
        <h2>About the role</h2>
        <p>Work with large private-market datasets and build research workflows.</p>
      </section>
      <section>
        <h2>Requirements</h2>
        <ul>
          <li>2+ years of experience in Python and SQL</li>
          <li>Experience building data products</li>
        </ul>
      </section>
      <a href="https://docs.google.com/forms/d/e/tracxn-data-scientist/viewform">Apply for this role</a>
    </main>
  </body>
</html>
`

const SDE_BACKEND_DETAIL_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>SDE - Backend</h1>
      <p>Department: Engineering</p>
      <p>Location: Bengaluru / Remote, India</p>
      <p>Employment Type: Full-time</p>
      <section>
        <h2>About the role</h2>
        <p>Build backend systems that power Tracxn workflows.</p>
      </section>
      <section>
        <h2>Requirements</h2>
        <ul>
          <li>3+ years of experience in Node.js</li>
          <li>Experience with distributed systems</li>
        </ul>
      </section>
      <a href="https://docs.google.com/forms/d/e/tracxn-backend/viewform">Apply for this role</a>
    </main>
  </body>
</html>
`

const loadTracxnModule = async () => {
  try {
    return await import('../tracxn/script.js')
  } catch {
    assert.fail('Expected Tracxn scraper module at ../tracxn/script.js')
  }
}

test('hasOfficialCareersSignal validates the verified Tracxn careers surface', async () => {
  const tracxn = await loadTracxnModule()

  assert.equal(tracxn.hasOfficialCareersSignal(CAREERS_HTML), true)
})

test('extractListings parses Tracxn careers cards into detail-page listings', async () => {
  const tracxn = await loadTracxnModule()

  assert.equal(tracxn.CAREERS_URL, 'https://w.tracxn.com/careers')

  const jobs = tracxn.extractListings(CAREERS_HTML)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Data Scientist',
    company: 'Tracxn Technologies Limited',
    department: 'Analytics',
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: 'data-scientist',
    requisitionId: 'data-scientist',
    sourceUrl: 'https://w.tracxn.com/career/data-scientist',
    applyUrl: 'https://w.tracxn.com/career/data-scientist',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
    remoteStatus: 'On-site',
  })

  assert.deepEqual(jobs[1], {
    title: 'SDE - Backend',
    company: 'Tracxn Technologies Limited',
    department: 'Engineering',
    location: 'Bengaluru / Remote, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: 'sde-backend',
    requisitionId: 'sde-backend',
    sourceUrl: 'https://w.tracxn.com/career/sde-backend',
    applyUrl: 'https://w.tracxn.com/career/sde-backend',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
    remoteStatus: 'Hybrid',
  })
})

test('extractJobDetail lifts Tracxn detail fields and Google Forms apply links', async () => {
  const tracxn = await loadTracxnModule()

  const listing = tracxn.extractListings(CAREERS_HTML)[0]
  const job = tracxn.extractJobDetail(DATA_SCIENTIST_DETAIL_HTML, listing)

  assert.equal(job.title, 'Data Scientist')
  assert.equal(job.department, 'Analytics')
  assert.equal(job.location, 'Bengaluru, India')
  assert.equal(job.city, 'Bengaluru')
  assert.equal(job.employmentType, 'Full-time')
  assert.equal(job.applyUrl, 'https://docs.google.com/forms/d/e/tracxn-data-scientist/viewform')
  assert.match(job.jobDescription, /private-market datasets/i)
  assert.equal(job.minimumQualification, '2+ years of experience in Python and SQL')
  assert.equal(job.preferredQualification, 'Experience building data products')
  assert.deepEqual(job.requiredSkills, [
    '2+ years of experience in Python and SQL',
    'Experience building data products',
  ])
})

test('run fetches the Tracxn careers page and detail pages, then decorates runner fields', async () => {
  const tracxn = await loadTracxnModule()
  const requestedUrls = []

  const jobs = await tracxn.createTracxnScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === 'https://w.tracxn.com/careers') return CAREERS_HTML
      if (url === 'https://w.tracxn.com/career/data-scientist') return DATA_SCIENTIST_DETAIL_HTML
      if (url === 'https://w.tracxn.com/career/sde-backend') return SDE_BACKEND_DETAIL_HTML

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-09T12:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    'https://w.tracxn.com/careers',
    'https://w.tracxn.com/career/data-scientist',
    'https://w.tracxn.com/career/sde-backend',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'tracxn')
  assert.equal(jobs[0].link, 'https://docs.google.com/forms/d/e/tracxn-data-scientist/viewform')
  assert.equal(jobs[0].scrapedAt, '2026-07-09T12:00:00.000Z')
})

test('run fails closed when the Tracxn careers surface changes', async () => {
  const tracxn = await loadTracxnModule()

  await assert.rejects(
    tracxn.createTracxnScraper().run({
      fetchText: async () => '<html><body>No open roles here</body></html>',
    }),
    /verified Tracxn careers surface/i,
  )
})
