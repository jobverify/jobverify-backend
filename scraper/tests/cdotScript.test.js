import assert from 'node:assert/strict'
import test from 'node:test'

const loadCdotModule = async () => {
  try {
    return await import('../cdot/script.js')
  } catch {
    return null
  }
}

const openingsHtml = `
  <html>
    <head>
      <meta name="author" content="Centre for Development of Telematics" />
      <title>Current Openings</title>
    </head>
    <body>
      <h2>Current Openings</h2>
      <table id="openings" class="table">
        <thead><tr><th>S_No</th><th>Post</th><th>Opening Date</th><th>Closing Date</th><th>Advertisement</th><th>Application Format</th></tr></thead>
        <tbody>
          <tr>
            <th>1</th>
            <td>Scientist B/C</td>
            <td>04-07-2026 09:00:00</td>
            <td>17-08-2026 17:00:00</td>
            <td><a href="../assets/docs/curr_openings/adv/Notification-Scientist.pdf">Advertisement</a></td>
            <td><a href="https://cdotrecruitment.cdot.in/cdotrecruitmentportal/college_home.jsp?adv_id=42">Apply Now</a></td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>
`

test('extractOpenings maps C-DOT official current-opening rows into shared job fields', async () => {
  const cdot = await loadCdotModule()
  assert.ok(cdot)

  assert.equal(cdot.hasCurrentOpeningsSignal(openingsHtml), true)
  assert.deepEqual(cdot.extractOpenings(openingsHtml), [{
    title: 'Scientist B/C',
    company: 'Centre for Development of Telematics (C-DOT)',
    department: null,
    location: 'India',
    city: null,
    state: null,
    country: 'India',
    jobId: 'cdot-42',
    requisitionId: 'cdot-42',
    sourceUrl: 'https://cdot.in/cdotweb/assets/docs/curr_openings/adv/Notification-Scientist.pdf',
    applyUrl: 'https://cdotrecruitment.cdot.in/cdotrecruitmentportal/college_home.jsp?adv_id=42',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-04T00:00:00.000Z',
    closingDate: '2026-08-17T00:00:00.000Z',
    jobDescription: 'Official C-DOT opening. See the advertisement for role details.',
  }])
})

test('run fetches the official C-DOT current-openings page and decorates the jobs', async () => {
  const cdot = await loadCdotModule()
  assert.ok(cdot)

  const requestedUrls = []
  const jobs = await cdot.createCdotScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return openingsHtml
    },
  })

  assert.deepEqual(requestedUrls, [cdot.CURRENT_OPENINGS_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'cdot')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
