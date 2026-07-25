import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-15T00:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
<head>
  <title>Careers at ESDS | IT and Cloud Job Opportunities</title>
  <meta name="description" content="Explore open roles across IT, cloud computing, cybersecurity, and support functions, as part of the ESDS career ecosystem." />
</head>
<body>
  <section class="innerPage_img">
    <h1>Life at ESDS</h1>
    <p>Find your Next Job</p>
    <h2>Jobs of the day</h2>
  </section>
  <div class="row">
    <div class="col-lg-4 col-sm-6 col-md-6 mb-3" onclick="window.location='https://www.esds.co.in/career-details/a688746f77752a'" style="cursor: pointer;">
      <div class="searchJobs_box2 mt-2 mb-2 hover-up">
        <div class="btnAll">
          <h5><a href="javascript:void(0)">Head of Engineering</a></h5>
        </div>
        <ul>
          <li><i class="ph ph-bag"></i>On-Roll</li>
          <li><i class="ph ph-alarm"></i>15-04-2026</li>
        </ul>
        <ol class="autoplaySlider">
          <li>Experience (Years): 10 - 20</li>
          <li>Department: Autonomous Cloud</li>
          <li>Business Unit: Software Division</li>
          <li>Job ID: a688746f77752a</li>
        </ol>
        <p class="m-0"><i class="ph ph-map-pin-line me-2"></i>Chennai</p>
      </div>
    </div>
    <div class="col-lg-4 col-sm-6 col-md-6 mb-3" onclick="window.location='https://www.esds.co.in/career-details/a6888578510db2'" style="cursor: pointer;">
      <div class="searchJobs_box2 mt-2 mb-2 hover-up">
        <div class="btnAll">
          <h5><a href="javascript:void(0)">Python Engineer</a></h5>
        </div>
        <ul>
          <li><i class="ph ph-bag"></i>On-Roll</li>
          <li><i class="ph ph-alarm"></i>11-06-2026</li>
        </ul>
        <ol class="autoplaySlider">
          <li>Experience (Years): 4 - 7</li>
          <li>Department: Autonomous Cloud</li>
          <li>Business Unit: Software Division</li>
          <li>Job ID: a6888578510db2</li>
        </ol>
        <p class="m-0"><i class="ph ph-map-pin-line me-2"></i>Nashik, Chennai, Pune, Mumbai</p>
      </div>
    </div>
  </div>
</body>
</html>
`

const headOfEngineeringDetailHtml = `
<!doctype html>
<html lang="en">
<head>
  <title>Life at ESDS</title>
</head>
<body>
  <h1><span style="font-size: larger;">Head of Engineering</span></h1>
  <table>
    <tr><td><strong>Job Title</strong></td><td>Head of Engineering</td></tr>
    <tr><td><strong>Company</strong></td><td>ESDS Software Solution Limited</td></tr>
    <tr><td><strong>Department</strong></td><td>Autonomous Cloud</td></tr>
    <tr><td><strong>Employee Type</strong></td><td>On-Roll</td></tr>
    <tr><td><strong>Experience Required</strong></td><td>10 - 20 Years</td></tr>
    <tr><td><strong>Location(s)</strong></td><td>Chennai, Tamil Nadu, India (ESDS_Chennai)<br></td></tr>
    <tr><td><strong>Country</strong></td><td>India</td></tr>
    <tr><td><strong>Updated On</strong></td><td>07-07-2026 14:56:11</td></tr>
    <tr>
      <td colspan="2">
        <a
          class="viewBtn-new"
          target="_blank"
          href="https://esds.darwinbox.in/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fa688746f77752a___apply%3D1"
        >
          Apply Now
        </a>
      </td>
    </tr>
  </table>
</body>
</html>
`

const pythonEngineerDetailHtml = `
<!doctype html>
<html lang="en">
<head>
  <title>Life at ESDS</title>
</head>
<body>
  <h1><span style="font-size: larger;">Python Engineer</span></h1>
  <table>
    <tr><td><strong>Job Title</strong></td><td>Python Engineer</td></tr>
    <tr><td><strong>Company</strong></td><td>ESDS Software Solution Limited</td></tr>
    <tr><td><strong>Department</strong></td><td>Autonomous Cloud</td></tr>
    <tr><td><strong>Employee Type</strong></td><td>On-Roll</td></tr>
    <tr><td><strong>Experience Required</strong></td><td>4 - 7 Years</td></tr>
    <tr><td><strong>Location(s)</strong></td><td>Nashik, Maharashtra, India (ESDS_Nashik)<br></td></tr>
    <tr><td><strong>Country</strong></td><td>India</td></tr>
    <tr><td><strong>Updated On</strong></td><td>11-06-2026 09:15:00</td></tr>
    <tr>
      <td colspan="2">
        <a
          class="viewBtn-new"
          target="_blank"
          href="https://esds.darwinbox.in/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fa6888578510db2___apply%3D1"
        >
          Apply Now
        </a>
      </td>
    </tr>
  </table>
</body>
</html>
`

const loadEsdsModule = async () => {
  try {
    return await import('../esds/script.js')
  } catch {
    assert.fail('Expected ESDS scraper module at ../esds/script.js')
  }
}

test('ESDS helpers keep the verified first-party careers listing and detail routes pinned', async () => {
  const esds = await loadEsdsModule()

  assert.equal(esds.SOURCE, 'esds')
  assert.equal(esds.COMPANY, 'ESDS')
  assert.equal(esds.OFFICIAL_BRAND_NAME, 'ESDS Software Solution Limited')
  assert.equal(esds.VERIFIED_ON, '2026-07-15')
  assert.equal(esds.HOMEPAGE_URL, 'https://www.esds.co.in/')
  assert.equal(esds.CAREERS_URL, 'https://www.esds.co.in/careers/')
  assert.equal(
    esds.buildDetailUrl('a688746f77752a'),
    'https://www.esds.co.in/career-details/a688746f77752a',
  )
  assert.equal(esds.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(esds.hasOfficialJobDetailSignal(headOfEngineeringDetailHtml), true)
  assert.equal(
    esds.extractDarwinboxApplyUrl(headOfEngineeringDetailHtml),
    'https://esds.darwinbox.in/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fa688746f77752a___apply%3D1',
  )
})

test('ESDS extracts the verified job cards and detail handoff fields from the first-party HTML surface', async () => {
  const esds = await loadEsdsModule()

  const cards = esds.extractJobCards(careersHtml)
  assert.equal(cards.length, 2)
  assert.deepEqual(cards, [
    {
      title: 'Head of Engineering',
      company: 'ESDS',
      department: 'Autonomous Cloud',
      location: 'Chennai',
      city: 'Chennai',
      country: null,
      jobId: 'a688746f77752a',
      requisitionId: 'a688746f77752a',
      sourceUrl: 'https://www.esds.co.in/career-details/a688746f77752a',
      applyUrl: 'https://www.esds.co.in/career-details/a688746f77752a',
      employmentType: 'On-Roll',
      experienceRequired: '10 - 20',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '15-04-2026',
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    },
    {
      title: 'Python Engineer',
      company: 'ESDS',
      department: 'Autonomous Cloud',
      location: 'Nashik, Chennai, Pune, Mumbai',
      city: 'Nashik',
      country: null,
      jobId: 'a6888578510db2',
      requisitionId: 'a6888578510db2',
      sourceUrl: 'https://www.esds.co.in/career-details/a6888578510db2',
      applyUrl: 'https://www.esds.co.in/career-details/a6888578510db2',
      employmentType: 'On-Roll',
      experienceRequired: '4 - 7',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '11-06-2026',
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    },
  ])

  const detail = esds.extractJobDetail(headOfEngineeringDetailHtml, cards[0])
  assert.equal(detail.title, 'Head of Engineering')
  assert.equal(detail.company, 'ESDS')
  assert.equal(detail.department, 'Autonomous Cloud')
  assert.equal(detail.location, 'Chennai')
  assert.equal(detail.city, 'Chennai')
  assert.equal(detail.country, 'India')
  assert.equal(detail.employmentType, 'On-Roll')
  assert.equal(detail.experienceRequired, '10 - 20 Years')
  assert.equal(detail.jobDescription, null)
  assert.equal(
    detail.applyUrl,
    'https://esds.darwinbox.in/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fa688746f77752a___apply%3D1',
  )
  assert.equal(
    detail.sourceUrl,
    'https://www.esds.co.in/career-details/a688746f77752a',
  )
})

test('run validates the verified ESDS careers surface and decorates first-party jobs with Darwinbox apply handoffs', async () => {
  const esds = await loadEsdsModule()
  const requestedUrls = []

  const jobs = await esds.createEsdsScraper({
    maxJobs: 1,
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === esds.CAREERS_URL) return careersHtml
      if (url === esds.buildDetailUrl('a688746f77752a')) return headOfEngineeringDetailHtml

      throw new Error(`Unexpected ESDS URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.esds.co.in/careers/',
    'https://www.esds.co.in/career-details/a688746f77752a',
  ])
  assert.deepEqual(jobs, [
    {
      title: 'Head of Engineering',
      company: 'ESDS',
      department: 'Autonomous Cloud',
      location: 'Chennai',
      city: 'Chennai',
      country: 'India',
      jobId: 'a688746f77752a',
      requisitionId: 'a688746f77752a',
      sourceUrl: 'https://www.esds.co.in/career-details/a688746f77752a',
      applyUrl: 'https://esds.darwinbox.in/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fa688746f77752a___apply%3D1',
      employmentType: 'On-Roll',
      experienceRequired: '10 - 20 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '15-04-2026',
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
      source: 'esds',
      link: 'https://esds.darwinbox.in/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fa688746f77752a___apply%3D1',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('run fails closed when the verified ESDS careers listing or detail surface drifts materially', async () => {
  const esds = await loadEsdsModule()

  await assert.rejects(
    esds.createEsdsScraper().run({
      fetchText: async () => careersHtml.replace('Jobs of the day', 'Career highlights'),
    }),
    /verified official careers surface/i,
  )

  await assert.rejects(
    esds.createEsdsScraper().run({
      fetchText: async (url) => {
        if (url === esds.CAREERS_URL) return careersHtml
        return headOfEngineeringDetailHtml.replace(
          'https://esds.darwinbox.in/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fa688746f77752a___apply%3D1',
          'https://example.com/apply/a688746f77752a',
        )
      },
    }),
    /verified public detail\/apply surface/i,
  )
})
