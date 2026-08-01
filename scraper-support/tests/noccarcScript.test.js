import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-16T00:00:00.000Z'

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Noccarc | MedTech Jobs in ICU Ventilators & Patient Monitors India</title>
  </head>
  <body>
    <main>
      <h1>Careers at Noccarc</h1>
      <p>Join a med-tech company building ICU ventilators, patient monitors and digital ICU platforms for Indian hospitals and beyond.</p>
      <h2>Job Openings</h2>
      <div class="job-card">
        <a href="https://www.naukri.com/job-listings-Regional-Sales-Manager-South-NOCCARC-Hyderabad-Bengaluru-Chennai-10-to-20-years-041025012082">
          <img alt="Job Opening: Regional Sales Manager - South" />
        </a>
        <h3>Regional Sales Manager - South</h3>
        <a href="https://www.naukri.com/jobs-in-bangalore">Bengaluru, Chennai, Hyderabad</a>
        <a href="https://www.naukri.com/jobs-in-hyderabad-secunderabad">10 - 20 years</a>
      </div>
      <div class="job-card">
        <a href="https://www.naukri.com/job-listings-clinical-application-specialist-noccarc-hyderabad-chennai-bengaluru-3-to-8-years-220126024989">
          <img alt="Job Opening: Clinical Application Specialist- South" />
        </a>
        <h3>Clinical Application Specialist- South</h3>
        <a href="https://www.naukri.com/jobs-in-bangalore">Bengaluru</a>
        <a href="https://www.naukri.com/jobs-in-hyderabad-secunderabad">3 - 8 years</a>
      </div>
      <div class="job-card">
        <a href="https://www.naukri.com/job-listings-Firmware-Engineer-I-NOCCARC-Pune-2-to-7-years-291225030582">
          <img alt="Job Opening: Senior Firmware Engineer" />
        </a>
        <h3>Senior Firmware Engineer</h3>
        <a href="https://www.naukri.com/jobs-in-pune">Pune</a>
        <a href="https://www.naukri.com/jobs-in-hyderabad-secunderabad">2 - 7 years</a>
      </div>
      <div class="job-card">
        <a href="https://www.naukri.com/job-listings-UI-UX-Designer-NOCCARC-Pune-2-to-6-years-061125033897">
          <img alt="Job Opening: UI/UX Designer" />
        </a>
        <h3>UI/UX Designer</h3>
        <a href="https://www.naukri.com/jobs-in-pune">Pune</a>
        <a href="https://www.naukri.com/jobs-in-hyderabad-secunderabad">2 - 6 years</a>
      </div>
      <a href="mailto:careers@noccarc.com">Email Your CV →</a>
      <h2>Based on 99 Reviews</h2>
    </main>
    <footer>Noccarc Robotics Pvt Ltd</footer>
  </body>
</html>
`

const DRIFTED_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Noccarc</title>
  </head>
  <body>
    <main>
      <h1>Careers at Noccarc</h1>
      <h2>Job Openings</h2>
      <p>Open positions will be updated soon.</p>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/noccarc/script.js')
  } catch {
    assert.fail('Expected Noccarc scraper module at ../../scraper/noccarc/script.js')
  }
}

test('Noccarc helpers stay pinned to the verified first-party careers page and outbound role-link structure', async () => {
  const noccarc = await loadModule()

  assert.equal(noccarc.SOURCE, 'noccarc')
  assert.equal(noccarc.COMPANY, 'Noccarc')
  assert.equal(noccarc.OFFICIAL_BRAND_NAME, 'Noccarc Robotics Pvt Ltd')
  assert.equal(noccarc.VERIFIED_ON, '2026-07-16')
  assert.equal(noccarc.CAREERS_URL, 'https://www.noccarc.com/careers')
  assert.equal(noccarc.OUTBOUND_JOB_HOST, 'naukri.com')
  assert.equal(noccarc.hasOfficialCareersSignal(CAREERS_HTML), true)

  assert.deepEqual(noccarc.extractJobCards(CAREERS_HTML), [
    {
      title: 'Regional Sales Manager - South',
      location: 'Bengaluru, Chennai, Hyderabad',
      experienceRequired: '10 - 20 years',
      detailUrl: 'https://www.naukri.com/job-listings-Regional-Sales-Manager-South-NOCCARC-Hyderabad-Bengaluru-Chennai-10-to-20-years-041025012082',
    },
    {
      title: 'Clinical Application Specialist- South',
      location: 'Bengaluru',
      experienceRequired: '3 - 8 years',
      detailUrl: 'https://www.naukri.com/job-listings-clinical-application-specialist-noccarc-hyderabad-chennai-bengaluru-3-to-8-years-220126024989',
    },
    {
      title: 'Senior Firmware Engineer',
      location: 'Pune',
      experienceRequired: '2 - 7 years',
      detailUrl: 'https://www.naukri.com/job-listings-Firmware-Engineer-I-NOCCARC-Pune-2-to-7-years-291225030582',
    },
    {
      title: 'UI/UX Designer',
      location: 'Pune',
      experienceRequired: '2 - 6 years',
      detailUrl: 'https://www.naukri.com/job-listings-UI-UX-Designer-NOCCARC-Pune-2-to-6-years-061125033897',
    },
  ])
})

test('Noccarc validates the first-party careers page and maps outbound role cards into jobs', async () => {
  const noccarc = await loadModule()
  const requestedUrls = []

  const jobs = await noccarc.createNoccarcScraper({
    maxJobs: 3,
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === noccarc.CAREERS_URL) return CAREERS_HTML
      throw new Error(`Unexpected Noccarc fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [noccarc.CAREERS_URL])
  assert.equal(jobs.length, 3)

  assert.deepEqual(jobs[0], {
    title: 'Regional Sales Manager - South',
    company: 'Noccarc',
    location: 'Bengaluru, Chennai, Hyderabad',
    city: null,
    country: 'India',
    link: 'https://www.naukri.com/job-listings-Regional-Sales-Manager-South-NOCCARC-Hyderabad-Bengaluru-Chennai-10-to-20-years-041025012082',
    applyUrl: 'https://www.naukri.com/job-listings-Regional-Sales-Manager-South-NOCCARC-Hyderabad-Bengaluru-Chennai-10-to-20-years-041025012082',
    sourceUrl: 'https://www.naukri.com/job-listings-Regional-Sales-Manager-South-NOCCARC-Hyderabad-Bengaluru-Chennai-10-to-20-years-041025012082',
    source: 'noccarc',
    jobId: '041025012082',
    requisitionId: '041025012082',
    department: null,
    employmentType: null,
    experienceRequired: '10 - 20 years',
    jobDescription: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    remoteStatus: 'On-site',
    scrapedAt: FIXED_SCRAPED_AT,
  })

  assert.deepEqual(jobs[1], {
    title: 'Clinical Application Specialist- South',
    company: 'Noccarc',
    location: 'Bengaluru',
    city: 'Bengaluru',
    country: 'India',
    link: 'https://www.naukri.com/job-listings-clinical-application-specialist-noccarc-hyderabad-chennai-bengaluru-3-to-8-years-220126024989',
    applyUrl: 'https://www.naukri.com/job-listings-clinical-application-specialist-noccarc-hyderabad-chennai-bengaluru-3-to-8-years-220126024989',
    sourceUrl: 'https://www.naukri.com/job-listings-clinical-application-specialist-noccarc-hyderabad-chennai-bengaluru-3-to-8-years-220126024989',
    source: 'noccarc',
    jobId: '220126024989',
    requisitionId: '220126024989',
    department: null,
    employmentType: null,
    experienceRequired: '3 - 8 years',
    jobDescription: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    remoteStatus: 'On-site',
    scrapedAt: FIXED_SCRAPED_AT,
  })

  assert.equal(jobs[2].title, 'Senior Firmware Engineer')
  assert.equal(jobs[2].location, 'Pune')
  assert.equal(
    jobs[2].sourceUrl,
    'https://www.naukri.com/job-listings-Firmware-Engineer-I-NOCCARC-Pune-2-to-7-years-291225030582',
  )
  assert.equal(jobs[2].jobId, '291225030582')
  assert.equal(jobs[2].experienceRequired, '2 - 7 years')
  assert.equal(jobs[2].scrapedAt, FIXED_SCRAPED_AT)
})

test('Noccarc fails closed when the verified careers page or role-card structure drifts', async () => {
  const noccarc = await loadModule()

  await assert.rejects(
    noccarc.createNoccarcScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /official careers page changed/i,
  )

  await assert.rejects(
    noccarc.createNoccarcScraper().run({
      fetchText: async () => DRIFTED_HTML,
    }),
    /verified first-party job-card structure/i,
  )
})
