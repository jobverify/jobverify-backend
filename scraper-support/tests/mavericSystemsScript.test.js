import assert from 'node:assert/strict'
import test from 'node:test'

const loadMavericSystemsModule = async () => {
  try {
    return await import('../../scraper/mavericsystems/script.js')
  } catch {
    return null
  }
}

const buildSummaryHtml = () => `
<!doctype html>
<html>
  <body>
    <table>
      <tbody>
        <tr class="jobResultItem">
          <td>
            <div role="heading" aria-level="3">
              <a class="jobTitle" href="/career?career_ns=job_listing&amp;company=mavericsys&amp;career_job_req_id=5673&amp;selected_lang=en_US&amp;browserTimeZone=Asia%2FCalcutta">
                Senior Test Engineer (J50967)
              </a>
            </div>
            <div class="noteSection" role="note">
              <div>
                Requisition ID:
                <span class="jobContentEM">5673</span>
                -
                <span class="jobContentEM">Posted on 07/10/2026</span>
                -
                <span class="jobContentEM">Bengaluru</span>
                -
                <span class="jobContentEM">Engineering</span>
              </div>
              <div>
                <span class="jobContentEM">No Travel</span>
              </div>
            </div>
          </td>
        </tr>
        <tr class="jobResultItem">
          <td>
            <div role="heading" aria-level="3">
              <a class="jobTitle" href="/career?career_ns=job_listing&amp;company=mavericsys&amp;career_job_req_id=5578&amp;selected_lang=en_US&amp;browserTimeZone=Asia%2FCalcutta">
                Senior Quality Engineer (J50989)
              </a>
            </div>
            <div class="noteSection" role="note">
              <div>
                Requisition ID:
                <span class="jobContentEM">5578</span>
                -
                <span class="jobContentEM">Posted on 07/06/2026</span>
                -
                <span class="jobContentEM">Chennai</span>
                -
                <span class="jobContentEM">Engineering</span>
              </div>
              <div>
                <span class="jobContentEM">No Travel</span>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <a title="Next Page" href="#">Next Page</a>
  </body>
</html>
`

const buildDetailHtml = () => `
<!doctype html>
<html>
  <body>
    <h1>Career Opportunities: Senior Test Engineer (J50967) (5673)</h1>
    <div class="job-detail">
      <div class="job-meta">
        Requisition ID 5673 - Posted 07/10/2026 - Assurance (ASE) - Bengaluru - Engineering - No Travel
      </div>
      <div class="job-description">
        <p>Work with automation, regression, and performance coverage for India programs.</p>
        <p>Partner with engineering and quality leaders across Bengaluru.</p>
      </div>
      <a href="/career?career_ns=job_apply&amp;company=mavericsys&amp;career_job_req_id=5673">Apply</a>
      <a href="#">Save Job</a>
      <a href="#">Email Job to Friend</a>
      <a href="#">Return to List</a>
    </div>
  </body>
</html>
`

const buildSummaryPageTwoHtml = () => `
<!doctype html>
<html>
  <body>
    <table>
      <tbody>
      </tbody>
    </table>
  </body>
</html>
`

test('Maveric Systems scraper module exports the verified first-party contract', async () => {
  const mavericSystems = await loadMavericSystemsModule()

  assert.ok(mavericSystems, 'Expected Maveric Systems scraper module to exist')
  assert.equal(mavericSystems.COMPANY_NAME, 'Maveric Systems')
  assert.equal(mavericSystems.CAREER_PAGE_URL, 'https://maveric-systems.com/careers/')
  assert.equal(
    mavericSystems.SUMMARY_URL,
    'https://career44.sapsf.com/career?company=mavericsys&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH&',
  )
  assert.equal(
    mavericSystems.buildDetailUrl('5673'),
    'https://career44.sapsf.com/career?career_ns=job_listing&company=mavericsys&navBarLevel=JOB_SEARCH&rcm_site_locale=en_US&selected_lang=en_US&browserTimeZone=Asia/Calcutta&career_job_req_id=5673',
  )
})

test('extractSearchResults parses Maveric Systems SuccessFactors rows', async () => {
  const mavericSystems = await loadMavericSystemsModule()

  assert.ok(mavericSystems, 'Expected Maveric Systems scraper module to exist')

  const jobs = mavericSystems.extractSearchResults(buildSummaryHtml())

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Senior Test Engineer (J50967)',
    company: 'Maveric Systems',
    department: 'Engineering',
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: '5673',
    requisitionId: '5673',
    sourceUrl: 'https://career44.sapsf.com/career?career_ns=job_listing&company=mavericsys&navBarLevel=JOB_SEARCH&rcm_site_locale=en_US&selected_lang=en_US&browserTimeZone=Asia/Calcutta&career_job_req_id=5673',
    applyUrl: 'https://career44.sapsf.com/career?career_ns=job_listing&company=mavericsys&navBarLevel=JOB_SEARCH&rcm_site_locale=en_US&selected_lang=en_US&browserTimeZone=Asia/Calcutta&career_job_req_id=5673',
    link: 'https://career44.sapsf.com/career?career_ns=job_listing&company=mavericsys&navBarLevel=JOB_SEARCH&rcm_site_locale=en_US&selected_lang=en_US&browserTimeZone=Asia/Calcutta&career_job_req_id=5673',
    postingDate: '07/10/2026',
    remoteStatus: 'On-site',
    jobDescription: null,
  })
})

test('extractJobDetail parses the verified detail page structure', async () => {
  const mavericSystems = await loadMavericSystemsModule()

  assert.ok(mavericSystems, 'Expected Maveric Systems scraper module to exist')

  const job = mavericSystems.extractJobDetail(buildDetailHtml(), {
    requisitionId: '5673',
    title: 'Senior Test Engineer (J50967)',
  })

  assert.equal(job.title, 'Senior Test Engineer (J50967)')
  assert.equal(job.requisitionId, '5673')
  assert.equal(job.applyUrl, 'https://career44.sapsf.com/career?career_ns=job_apply&company=mavericsys&career_job_req_id=5673')
  assert.match(job.jobDescription, /automation, regression, and performance coverage/i)
})

test('run uses the verified homepage, careers page, injected HTTP summary pages, and job details', async () => {
  const mavericSystems = await loadMavericSystemsModule()

  assert.ok(mavericSystems, 'Expected Maveric Systems scraper module to exist')

  const requestedUrls = []
  const summaryHtml = buildSummaryHtml()
  const summaryPageTwoHtml = buildSummaryPageTwoHtml()
  const detailHtml = buildDetailHtml()
  const jobs = await mavericSystems.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === 'https://maveric-systems.com/') {
        return '<html><body><h1>Maveric Systems</h1></body></html>'
      }
      if (url === 'https://maveric-systems.com/careers/') {
        return '<html><body><a href="https://career44.sapsf.com/career?company=mavericsys">Jobs</a></body></html>'
      }
      if (url.includes('career_job_req_id=')) return detailHtml
      throw new Error(`Unexpected fetch URL: ${url}`)
    },
    getSearchPages: async ({ searchUrl }) => {
      requestedUrls.push(searchUrl)
      return [summaryHtml, summaryPageTwoHtml]
    },
  })

  assert.deepEqual(requestedUrls.slice(0, 2), [
    'https://maveric-systems.com/',
    'https://maveric-systems.com/careers/',
  ])
  assert.match(requestedUrls[2], /career44\.sapsf\.com\/career\?company=mavericsys&career_ns=job_listing_summary/i)
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'mavericsystems')
  assert.equal(jobs[0].company, 'Maveric Systems')
  assert.equal(jobs[0].applyUrl, 'https://career44.sapsf.com/career?career_ns=job_apply&company=mavericsys&career_job_req_id=5673')
  assert.equal(jobs[0].country, 'India')
})

test('API-only run stops before returning a partial Maveric board when SuccessFactors requires unverified pagination', async () => {
  const mavericSystems = await loadMavericSystemsModule()

  await assert.rejects(
    mavericSystems.run({
      fetchText: async (url) => {
        if (url === mavericSystems.HOMEPAGE_URL) {
          return '<html><body><h1>Maveric Systems</h1></body></html>'
        }
        if (url === mavericSystems.CAREER_PAGE_URL) {
          return '<html><body><a href="https://career44.sapsf.com/career?company=mavericsys">Jobs</a></body></html>'
        }
        if (url === mavericSystems.SUMMARY_URL) return buildSummaryHtml()
        throw new Error(`Unexpected Maveric Systems URL: ${url}`)
      },
    }),
    /Maveric Systems API-only migration required.*pagination.*browser automation is disabled/i,
  )
})
