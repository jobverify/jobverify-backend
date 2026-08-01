import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_PAGE_URL,
  COMPANY,
  HOMEPAGE_URL,
  SOURCE,
  createCrRaoAimscsScraper,
  extractOpenings,
  hasCareersPageSignal,
  hasOfficialHomepageSignal,
} from '../../scraper/crraoaimscs/script.js'

const homepageHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>CRRao AIMSCS</title>
  </head>
  <body>
    <h2><strong>C.R.Rao Advanced Institute of Mathematics, Statistics and Computer Science (AIMSCS)</strong></h2>
    <p><strong>University of Hyderabad Campus, Gachibowli, Hyderabad - 500 046</strong></p>
    <ul>
      <li><a href="/careers.php">Careers</a></li>
    </ul>
  </body>
</html>
`

const careersHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Careers</title>
  </head>
  <body>
    <h2 class="text-primary">Careers-Technical Positions</h2>
    <table width="100%">
      <tbody>
        <tr>
          <td>
            <p style="color: #fff;">Faculty Positions <strong>(CRR/04/2025)</strong><img src="new-gif.gif" /></p>
          </td>
        </tr>
        <tr>
          <td>
            <p><strong>Posted Date</strong> : 14-11-2025 <strong>Last Date :</strong> 06-12-2025</p>
          </td>
        </tr>
        <tr>
          <td>
            <p>
              <a href="uploads/Advertisement-CRRaoFaculty_CR_6Dec2025.pdf">View/Download Advertisement</a><br />
              <a href="uploads/ApplicationForm-CRR042025.doc">View/Download Application Form</a>
            </p>
          </td>
        </tr>
      </tbody>
    </table>
    <table width="100%">
      <tbody>
        <tr>
          <td>
            <p style="color: #fff;">Positions of Project Scientist, Project Associate-II</p>
          </td>
        </tr>
        <tr>
          <td>
            <p><strong>Posted Date</strong> : 05-01-2024<strong>Last Date :</strong> 15-01-2024</p>
          </td>
        </tr>
        <tr>
          <td>
            <p><a href="uploads/qr-2024.pdf">View/Download Advertisement</a></p>
          </td>
        </tr>
      </tbody>
    </table>
    <h2 class="text-primary">Careers-Non-Technical Positions</h2>
    <table width="100%">
      <tbody>
        <tr>
          <td>
            <p style="color: #fff;">Positions of Security Guards <strong>(Rectt/225/01)</strong></p>
          </td>
        </tr>
        <tr>
          <td>
            <p><strong>Posted Date</strong> : 20-03-2025 <strong>Last Date :</strong> 14-04-2025</p>
          </td>
        </tr>
        <tr>
          <td>
            <p><a href="uploads/CRRAO-2025-01.pdf">View/Download Advertisement</a></p>
          </td>
        </tr>
      </tbody>
    </table>
    <p>director@crraoaimscs.res.in</p>
    <p>CR Rao AIMSCS</p>
  </body>
</html>
`

const currentCareersHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Careers</title>
  </head>
  <body>
    <h2><strong>C.R.Rao Advanced Institute of Mathematics, Statistics and Computer Science (AIMSCS)</strong></h2>
    <p><strong>University of Hyderabad Campus, Gachibowli, Hyderabad - 500 046</strong></p>
    <h2 class="text-primary">Careers-Technical Positions</h2>
    <table width="100%"><tbody>
      <tr><td><p style="color: #fff;">Faculty Positions<strong>(CRR/04/2025)</strong> --&gt;</p></td></tr>
      <tr><td><p><strong>Posted Date</strong> : 14-11-2025 <strong>Last Date :</strong> 06-12-2025</p></td></tr>
      <tr><td><p>
        <a href="uploads/Advertisement-CRRaoFaculty_CR_6Dec2025.pdf">View/Download Advertisement</a><br />
        <a href="uploads/ApplicationForm-CRR042025.doc">View/Download Application Form</a>
      </p></td></tr>
    </tbody></table>
    <h2 class="text-primary">Careers-Non-Technical Positions</h2>
  </body>
</html>
`

test('CR Rao AIMSCS helpers stay pinned to the verified official homepage and careers listing structure', () => {
  assert.equal(SOURCE, 'crraoaimscs')
  assert.equal(COMPANY, 'CR Rao Advanced Institute of Mathematics, Statistics and Computer Science (AIMSCS)')
  assert.equal(HOMEPAGE_URL, 'https://crraoaimscs.res.in/')
  assert.equal(CAREERS_PAGE_URL, 'https://crraoaimscs.res.in/careers.php')
  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hasCareersPageSignal(careersHtml), true)
  assert.equal(hasCareersPageSignal(currentCareersHtml), true)

  const openings = extractOpenings(careersHtml)
  assert.equal(openings.length, 3)

  assert.deepEqual(openings[0], {
    title: 'Faculty Positions',
    company: COMPANY,
    department: 'Technical Positions',
    location: 'Hyderabad, Telangana, India',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    jobId: 'crraoaimscs-crr-04-2025-faculty-positions-2025-11-14',
    requisitionId: 'CRR/04/2025',
    sourceUrl: 'https://crraoaimscs.res.in/uploads/Advertisement-CRRaoFaculty_CR_6Dec2025.pdf',
    applyUrl: 'https://crraoaimscs.res.in/uploads/ApplicationForm-CRR042025.doc',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2025-11-14',
    closingDate: '2025-12-06',
    jobDescription: 'Official CR Rao Advanced Institute of Mathematics, Statistics and Computer Science (AIMSCS) technical positions recruitment notice. Review the advertisement and application form for eligibility and submission details.',
  })

  assert.equal(openings[1].title, 'Positions of Project Scientist, Project Associate-II')
  assert.equal(openings[1].requisitionId, null)
  assert.equal(openings[1].applyUrl, 'https://crraoaimscs.res.in/uploads/qr-2024.pdf')
  assert.equal(openings[1].postingDate, '2024-01-05')
  assert.equal(openings[1].closingDate, '2024-01-15')

  assert.equal(openings[2].title, 'Positions of Security Guards')
  assert.equal(openings[2].department, 'Non-Technical Positions')
  assert.equal(openings[2].requisitionId, 'Rectt/225/01')
  assert.equal(openings[2].sourceUrl, 'https://crraoaimscs.res.in/uploads/CRRAO-2025-01.pdf')

  const currentOpenings = extractOpenings(currentCareersHtml)
  assert.equal(currentOpenings.length, 1)
  assert.equal(currentOpenings[0].title, 'Faculty Positions')
})

test('run validates the official CR Rao AIMSCS surfaces and decorates extracted openings', async () => {
  const requestedUrls = []
  const jobs = await createCrRaoAimscsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === HOMEPAGE_URL) {
        return homepageHtml
      }

      if (url === CAREERS_PAGE_URL) {
        return careersHtml
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2025-03-25T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [HOMEPAGE_URL, CAREERS_PAGE_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, SOURCE)
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2025-03-25T00:00:00.000Z')
  assert.equal(jobs[1].applyUrl, 'https://crraoaimscs.res.in/uploads/CRRAO-2025-01.pdf')
})

test('run fails closed when the CR Rao AIMSCS homepage or careers page drifts materially', async () => {
  await assert.rejects(
    createCrRaoAimscsScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) {
          return '<html><head><title>Placeholder</title></head><body>No institute signal</body></html>'
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    createCrRaoAimscsScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) {
          return homepageHtml
        }

        if (url === CAREERS_PAGE_URL) {
          return '<html><head><title>Careers</title></head><body><h2>Careers</h2></body></html>'
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified careers page|expected first-party jobs surface/i,
  )
})
