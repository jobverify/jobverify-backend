import assert from 'node:assert/strict'
import test from 'node:test'

const loadAdda247Module = async () => {
  try {
    return await import('../../scraper/adda247/script.js')
  } catch {
    assert.fail('Expected Adda247 scraper module at ../../scraper/adda247/script.js')
  }
}

const careersShellHtml = `
<!DOCTYPE html>
<html>
  <head>
    <title>Work with us Adda247</title>
  </head>
  <body>
    <h1>#JobHaiTohRaubHai</h1>
    <p># Join Adda247 to change the future of education.</p>
    <a href="https://docs.google.com/forms/d/e/1FAIpQLScareers/viewform">Join Us</a>
    <h2>Why join us?</h2>
    <p>Become a part of the mission to provide high quality affordable education to Bharat!</p>
    <h2>Working with us</h2>
    <p>We take care of you so that you can build Bharat with us!</p>
    <a href="https://adda247.kekahire.com/">View all openings</a>
  </body>
</html>
`

const careersWithFirstPartyJobRecordHtml = `
<!DOCTYPE html>
<html>
  <body>
    <h1>#JobHaiTohRaubHai</h1>
    <p># Join Adda247 to change the future of education.</p>
    <a href="https://docs.google.com/forms/d/e/1FAIpQLScareers/viewform">Join Us</a>
    <a href="https://adda247.kekahire.com/">View all openings</a>
    <a href="https://www.adda247.com/careers/openings/senior-software-engineer">Senior Software Engineer</a>
  </body>
</html>
`

const kekaActiveJobsPayload = [
  {
    id: 133120,
    title: 'Exam Counsellor',
    description: '<div><strong>Job Title: Exam Counsellor (Inside Sales)</strong></div><div><strong>Work Mode:</strong> Work From Office</div>',
    departmentName: 'Telesales',
    excerpt: 'Job Title: Exam Counsellor (Inside Sales) Work Mode: Work From Office',
    jobLocations: [
      { name: 'Lucknow', city: 'Lucknow', state: 'UP', countryCode: 'IN', countryName: 'India' },
      { name: 'Gurugram', city: 'Haryana', state: 'HR', countryCode: 'IN', countryName: 'India' },
    ],
    jobType: 2,
    experience: '1',
    jobNumber: 'RRF0000003374',
    salaryRangeFormat: 'INR 2,00,000.00 - 3,50,000.00',
    publishedOn: '2026-06-29T10:26:34.48Z',
    skillNames: ['English Communication', 'Edtech sales'],
  },
  {
    id: 120977,
    title: 'Executive - Content & Course Management',
    description: '<div>Content Developer for GS | Proof Reading | Creation | Correction | Writing Skills</div>',
    departmentName: 'Content Development',
    excerpt: 'Content Developer for GS | Proof Reading | Creation | Correction | Writing Skills',
    jobLocations: [
      { name: 'Gurugram', city: 'Haryana', state: 'HR', countryCode: 'IN', countryName: 'India' },
    ],
    jobType: 2,
    experience: '1 year',
    jobNumber: 'RRF0000002930',
    salaryRangeFormat: 'INR 24,000.00 - 24,001.00',
    publishedOn: '2026-05-29T07:33:28.3Z',
    skillNames: ['communication', 'Student Focus', 'Team work', 'creative'],
  },
]

test('Adda247 validates the verified first-party careers shell and current external handoff', async () => {
  const adda247 = await loadAdda247Module()

  assert.equal(adda247.SOURCE, 'adda247')
  assert.equal(adda247.COMPANY, 'Adda247')
  assert.equal(adda247.VERIFIED_AT, '2026-07-19')
  assert.equal(adda247.CAREERS_URL, 'https://www.adda247.com/careers.html')
  assert.equal(adda247.EXTERNAL_HANDOFF_URL, 'https://adda247.kekahire.com/')
  assert.equal(adda247.KEKA_CAREERS_URL, 'https://adda247.keka.com/careers/')
  assert.equal(
    adda247.KEKA_ACTIVE_JOBS_API_URL,
    'https://adda247.keka.com/careers/api/jobs/default/active',
  )
  assert.equal(adda247.hasOfficialCareersSignal(careersShellHtml), true)
  assert.equal(
    adda247.extractJoinUsUrl(careersShellHtml),
    'https://docs.google.com/forms/d/e/1FAIpQLScareers/viewform',
  )
  assert.equal(
    adda247.extractExternalHandoffUrl(careersShellHtml),
    adda247.EXTERNAL_HANDOFF_URL,
  )
  assert.deepEqual(adda247.extractFirstPartyJobRecordUrls(careersShellHtml), [])
})

test('Adda247 maps Keka active jobs into the shared India job shape', async () => {
  const adda247 = await loadAdda247Module()

  assert.deepEqual(
    adda247.extractKekaJobs(kekaActiveJobsPayload, {
      now: () => '2026-07-19T00:00:00.000Z',
    }).map((job) => ({
      title: job.title,
      department: job.department,
      location: job.location,
      city: job.city,
      country: job.country,
      jobId: job.jobId,
      requisitionId: job.requisitionId,
      sourceUrl: job.sourceUrl,
      source: job.source,
      postingDate: job.postingDate,
      experienceRequired: job.experienceRequired,
      requiredSkills: job.requiredSkills,
    })),
    [
      {
        title: 'Exam Counsellor',
        department: 'Telesales',
        location: 'Lucknow, India; Gurugram, India',
        city: 'Lucknow',
        country: 'India',
        jobId: '133120',
        requisitionId: 'RRF0000003374',
        sourceUrl: 'https://adda247.keka.com/careers/jobdetails/133120',
        source: 'adda247',
        postingDate: '2026-06-29T10:26:34.48Z',
        experienceRequired: '1',
        requiredSkills: ['English Communication', 'Edtech sales'],
      },
      {
        title: 'Executive - Content & Course Management',
        department: 'Content Development',
        location: 'Gurugram, India',
        city: 'Gurugram',
        country: 'India',
        jobId: '120977',
        requisitionId: 'RRF0000002930',
        sourceUrl: 'https://adda247.keka.com/careers/jobdetails/120977',
        source: 'adda247',
        postingDate: '2026-05-29T07:33:28.3Z',
        experienceRequired: '1 year',
        requiredSkills: ['communication', 'Student Focus', 'Team work', 'creative'],
      },
    ],
  )
})

test('Adda247 returns Keka jobs after validating the verified first-party careers page and external handoff', async () => {
  const adda247 = await loadAdda247Module()
  const requestedUrls = []

  const jobs = await adda247.createAdda247Scraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === adda247.CAREERS_URL) {
        return careersShellHtml
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)
      if (url === adda247.KEKA_ACTIVE_JOBS_API_URL) {
        return kekaActiveJobsPayload
      }

      throw new Error(`Unexpected JSON URL: ${url}`)
    },
    now: () => '2026-07-19T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [adda247.CAREERS_URL, adda247.KEKA_ACTIVE_JOBS_API_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Exam Counsellor')
  assert.equal(jobs[0].source, 'adda247')
  assert.equal(jobs[0].link, 'https://adda247.keka.com/careers/jobdetails/133120')
})

test('Adda247 can recover with a browser-backed first-party careers shell when direct requests are blocked', async () => {
  const adda247 = await loadAdda247Module()
  const browserUrls = []

  const jobs = await adda247.createAdda247Scraper().run({
    fetchText: async () => {
      throw new Error(`HTTP 403 for ${adda247.CAREERS_URL}`)
    },
    fetchBrowserText: async (url) => {
      browserUrls.push(url)
      return careersShellHtml
    },
    fetchJson: async (url) => {
      if (url === adda247.KEKA_ACTIVE_JOBS_API_URL) {
        return kekaActiveJobsPayload
      }

      throw new Error(`Unexpected JSON URL: ${url}`)
    },
    now: () => '2026-07-19T00:00:00.000Z',
  })

  assert.deepEqual(browserUrls, [adda247.CAREERS_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'adda247')
})

test('Adda247 fails closed when the first-party careers shell changes or starts exposing first-party job records', async () => {
  const adda247 = await loadAdda247Module()

  await assert.rejects(
    adda247.createAdda247Scraper().run({
      fetchText: async () => careersShellHtml.replace(
        'https://adda247.kekahire.com/',
        'https://www.adda247.com/jobs',
      ),
    }),
    /verified first-party careers shell/i,
  )

  await assert.rejects(
    adda247.createAdda247Scraper().run({
      fetchText: async () => careersWithFirstPartyJobRecordHtml,
    }),
    /first-party careers page now exposes public job records/i,
  )
})
