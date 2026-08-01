import assert from 'node:assert/strict'
import test from 'node:test'

const loadMovateModule = async () => {
  try {
    return await import('../../scraper/movate/script.js')
  } catch {
    return null
  }
}

const HOMEPAGE_HTML = `
  <html>
    <head><title>Careers at Movate</title></head>
    <body>
      <h1>Careers at Movate</h1>
      <a href="https://www.movate.com/careers/latest-job-openings/">Latest Job Openings</a>
    </body>
  </html>
`

const JOBS_PAGE_HTML = `
  <html>
    <head><title>Latest Job Openings - Movate</title></head>
    <body>
      <script>
        var arrayList = ${JSON.stringify([
          {
            job_id: 'a695e221105b23',
            job_title: 'Senior Technical Support Engineer',
            location: 'Chennai, Tamil Nadu, India',
            location_country: 'India',
            department: 'Customer Success',
            experience: '3 - 5 Years',
            post_on_careers_page: 1,
            posted_date: '2026-07-08',
          },
          {
            job_id: 'a695e221105b24',
            job_title: 'Enterprise Sales Director',
            location: 'Dallas, Texas, United States',
            location_country: 'United States',
            department: 'Sales',
            experience: '8 - 10 Years',
            post_on_careers_page: 1,
            posted_date: '2026-07-07',
          },
          {
            job_id: 'a695e221105b25',
            job_title: 'Hidden QA Engineer',
            location: 'Bangalore, Karnataka, India',
            location_country: 'India',
            department: 'Engineering',
            experience: '2 - 4 Years',
            post_on_careers_page: 0,
            posted_date: '2026-07-06',
          },
        ])};
      </script>
    </body>
  </html>
`

const DETAIL_HTML = `
  <html>
    <head><title>Senior Technical Support Engineer - Movate</title></head>
    <body>
      <h1>Senior Technical Support Engineer</h1>
      <div class="job-location">Chennai, Tamil Nadu, India</div>
      <div class="job-department">Customer Success</div>
      <div class="job-description">
        <p>Deliver enterprise support for global customers.</p>
        <ul>
          <li>Technical troubleshooting</li>
          <li>Customer communication</li>
        </ul>
      </div>
      <a
        class="apply-now"
        href="https://movate.darwinbox.com/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fa695e221105b23___apply%3D1"
      >
        Apply Now
      </a>
    </body>
  </html>
`

test('Movate constants stay pinned to the verified official careers and jobs pages', async () => {
  const movate = await loadMovateModule()
  assert.ok(movate)

  assert.equal(movate.HOMEPAGE_URL, 'https://www.movate.com/careers-at-movate/')
  assert.equal(movate.JOBS_PAGE_URL, 'https://www.movate.com/careers/latest-job-openings/')
  assert.equal(
    movate.buildDetailUrl('a695e221105b23'),
    'https://www.movate.com/job-details/?job_id=a695e221105b23',
  )
})

test('extractIndiaJobs keeps only visible India jobs from the embedded Movate arrayList payload', async () => {
  const movate = await loadMovateModule()
  assert.ok(movate)

  const records = movate.extractJobListData(JOBS_PAGE_HTML)
  const jobs = movate.extractIndiaJobs(records)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior Technical Support Engineer',
    company: 'Movate',
    department: 'Customer Success',
    location: 'Chennai, Tamil Nadu, India',
    city: 'Chennai',
    country: 'India',
    jobId: 'a695e221105b23',
    requisitionId: 'a695e221105b23',
    sourceUrl: 'https://www.movate.com/job-details/?job_id=a695e221105b23',
    applyUrl: 'https://www.movate.com/job-details/?job_id=a695e221105b23',
    employmentType: null,
    experienceRequired: '3 - 5 Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-08',
    closingDate: null,
    jobDescription: null,
    remoteStatus: null,
  })
})

test('extractJobDetail pulls the Movate Darwinbox apply handoff and detail description', async () => {
  const movate = await loadMovateModule()
  assert.ok(movate)

  const detail = movate.extractJobDetail(DETAIL_HTML, {
    title: 'Senior Technical Support Engineer',
    company: 'Movate',
    department: 'Customer Success',
    location: 'Chennai, Tamil Nadu, India',
    city: 'Chennai',
    country: 'India',
    jobId: 'a695e221105b23',
    requisitionId: 'a695e221105b23',
    sourceUrl: movate.buildDetailUrl('a695e221105b23'),
    applyUrl: movate.buildDetailUrl('a695e221105b23'),
    employmentType: null,
    experienceRequired: '3 - 5 Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-08',
    closingDate: null,
    jobDescription: null,
    remoteStatus: null,
  })

  assert.equal(detail.title, 'Senior Technical Support Engineer')
  assert.equal(detail.department, 'Customer Success')
  assert.equal(detail.location, 'Chennai, Tamil Nadu, India')
  assert.equal(detail.city, 'Chennai')
  assert.match(detail.jobDescription, /enterprise support/i)
  assert.deepEqual(detail.requiredSkills, ['Technical troubleshooting', 'Customer communication'])
  assert.equal(
    detail.applyUrl,
    'https://movate.darwinbox.com/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fa695e221105b23___apply%3D1',
  )
  assert.equal(
    detail.sourceUrl,
    'https://www.movate.com/job-details/?job_id=a695e221105b23',
  )
})

test('run validates the official Movate careers surfaces and decorates shared runner fields', async () => {
  const movate = await loadMovateModule()
  assert.ok(movate)

  const requestedUrls = []
  const jobs = await movate.createMovateScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === movate.HOMEPAGE_URL) return HOMEPAGE_HTML
      if (url === movate.JOBS_PAGE_URL) return JOBS_PAGE_HTML
      if (url === movate.buildDetailUrl('a695e221105b23')) return DETAIL_HTML

      throw new Error(`Unexpected Movate URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.movate.com/careers-at-movate/',
    'https://www.movate.com/careers/latest-job-openings/',
    'https://www.movate.com/job-details/?job_id=a695e221105b23',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'movate')
  assert.equal(jobs[0].company, 'Movate')
  assert.equal(
    jobs[0].link,
    'https://movate.darwinbox.com/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fa695e221105b23___apply%3D1',
  )
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
