import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const currentJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Current Job Openings</title>
  </head>
  <body>
    <div class="wrapper">
      <table width="100" border="0" cellpadding="0" cellspacing="0" class="railtel_table">
        <tbody>
          <tr class="heading">
            <td>S.No</td>
          </tr>
        </tbody>
      </table>

      <table width="100" border="0" cellpadding="0" cellspacing="0" class="railtel_table">
        <tbody>
          <tr class="heading">
            <td>DEPUTATION/Re-employment for 1 post of Junior Translator/ E-0 at Corporate Office, Delhi</td>
          </tr>
          <tr>
            <td><a title="download" href="/images/careers/JR translator Vacancy notice dt 15072026.pdf" target="_blank">DEPUTATION/Re-employment for 1 post of Junior Translator/ E-0 at Corporate Office, Delhi<img src="/images/new-blink.gif" class="animated-image"></a></td>
          </tr>
          <tr>
            <td><a title="download" href="/images/careers/Proforma for Deputation Re.pdf" target="_blank">Application Proforma I</a></td>
          </tr>
          <tr>
            <td><a title="download" href="/images/careers/Performa for re-employment Re.pdf" target="_blank">Application Proforma II</a></td>
          </tr>
        </tbody>

      <table width="100" border="0" cellpadding="0" cellspacing="0" class="railtel_table">
        <tbody>
          <tr class="heading">
            <td>Notice for Regular Recruitment in Technical Department of RailTel Corporation including Backlog Vacancies for Data Centre Posts</td>
          </tr>
          <tr>
            <td><a title="download" href="/images/careers/Result DC 2026.pdf" target="_blank">List of Provisionally Suitable Candidates for Pre-Appointment Medical Examination</a></td>
          </tr>
          <tr>
            <td><a title="download" href="/images/careers/FINAL VACANCY NOTICE-48 POSTS.pdf" target="_blank">Detailed Vacancy Notice No. RCIL/2025/P&A/44/3</a></td>
          </tr>
          <tr>
            <td><a title="download" href="https://cdn.digialm.com/EForms/configuredHtml/1258/94400/Index.html" target="_blank">Click here to apply</a></td>
          </tr>
        </tbody>
      </table>

      <table width="100" border="0" cellpadding="0" cellspacing="0" class="railtel_table">
        <tbody>
          <tr class="heading">
            <td>NOTICE FOR ENGAGEMENT OF EXPERIENCED TECHNICAL PERSONNEL FOR MPSEDC DC DR PROJECT OF RAILTEL ON CONTRACT BASIS</td>
          </tr>
          <tr>
            <td><a title="download" href="/images/careers/Corrigendum -1 dt 16.06.2026.pdf" target="_blank">Corrigendum-1</a></td>
          </tr>
          <tr>
            <td><a title="download" href="/images/careers/Vacancy Notification MPSEDC DC DR PROJECT.pdf" target="_blank">Walk-in Interview Vacancy Notice for Engagement of Experience Technical Person for MPSEDC DC-DR Project of Railtel, on Contract Basis</a></td>
          </tr>
          <tr>
            <td><a title="download" href="/images/careers/Annexure-1 MPSEDC DC DR PROJECT.pdf" target="_blank">Annexure-I</a></td>
          </tr>
        </tbody>
      </table>
    </div>
  </body>
</html>
`

const loadRailTelModule = async () => {
  try {
    return await import('../../scraper/railtel/script.js')
  } catch {
    assert.fail('Expected RailTel scraper module at ../../scraper/railtel/script.js')
  }
}

test('RailTel scraper pins the verified current openings page and first-party vacancy table extraction contract', async () => {
  const railTel = await loadRailTelModule()

  assert.equal(railTel.SOURCE, 'railtel')
  assert.equal(railTel.COMPANY, 'RailTel')
  assert.equal(railTel.VERIFIED_ON, '2026-07-17')
  assert.equal(railTel.CURRENT_JOBS_URL, 'https://www.railtel.in/current-job-openings.html')
  assert.equal(railTel.OFFICIAL_CAREERS_HUB_URL, 'https://www.railtel.in/career.html')
  assert.equal(railTel.hasOfficialCurrentJobsSignal(currentJobsHtml), true)

  const jobs = railTel.extractCurrentJobs(currentJobsHtml)

  assert.deepEqual(jobs, [
    {
      title: 'DEPUTATION/Re-employment for 1 post of Junior Translator/ E-0 at Corporate Office, Delhi',
      location: 'Corporate Office, Delhi, India',
      city: 'Corporate Office',
      country: 'India',
      jobId: 'deputation-re-employment-for-1-post-of-junior-translator-e-0-at-corporate-office-delhi',
      requisitionId: 'deputation-re-employment-for-1-post-of-junior-translator-e-0-at-corporate-office-delhi',
      sourceUrl: 'https://www.railtel.in/images/careers/JR%20translator%20Vacancy%20notice%20dt%2015072026.pdf',
      applyUrl: 'https://www.railtel.in/images/careers/JR%20translator%20Vacancy%20notice%20dt%2015072026.pdf',
      employmentType: null,
      jobDescription:
        'DEPUTATION/Re-employment for 1 post of Junior Translator/ E-0 at Corporate Office, Delhi',
      remoteStatus: null,
    },
    {
      title: 'Notice for Regular Recruitment in Technical Department of RailTel Corporation including Backlog Vacancies for Data Centre Posts',
      location: null,
      city: null,
      country: 'India',
      jobId: 'notice-for-regular-recruitment-in-technical-department-of-railtel-corporation-including-backlog-vacancies-for-data-centre-posts',
      requisitionId: 'notice-for-regular-recruitment-in-technical-department-of-railtel-corporation-including-backlog-vacancies-for-data-centre-posts',
      sourceUrl: 'https://www.railtel.in/images/careers/FINAL%20VACANCY%20NOTICE-48%20POSTS.pdf',
      applyUrl: 'https://cdn.digialm.com/EForms/configuredHtml/1258/94400/Index.html',
      employmentType: 'Full-time',
      jobDescription:
        'Detailed Vacancy Notice No. RCIL/2025/P&A/44/3 Click here to apply',
      remoteStatus: null,
    },
    {
      title: 'NOTICE FOR ENGAGEMENT OF EXPERIENCED TECHNICAL PERSONNEL FOR MPSEDC DC DR PROJECT OF RAILTEL ON CONTRACT BASIS',
      location: null,
      city: null,
      country: 'India',
      jobId: 'notice-for-engagement-of-experienced-technical-personnel-for-mpsedc-dc-dr-project-of-railtel-on-contract-basis',
      requisitionId: 'notice-for-engagement-of-experienced-technical-personnel-for-mpsedc-dc-dr-project-of-railtel-on-contract-basis',
      sourceUrl: 'https://www.railtel.in/images/careers/Vacancy%20Notification%20MPSEDC%20DC%20DR%20PROJECT.pdf',
      applyUrl: 'https://www.railtel.in/images/careers/Vacancy%20Notification%20MPSEDC%20DC%20DR%20PROJECT.pdf',
      employmentType: 'Contract',
      jobDescription:
        'Walk-in Interview Vacancy Notice for Engagement of Experience Technical Person for MPSEDC DC-DR Project of Railtel, on Contract Basis',
      remoteStatus: null,
    },
  ])
})

test('RailTel run validates the verified current openings page and decorates first-party jobs for the shared runner', async () => {
  const railTel = await loadRailTelModule()
  const requestedUrls = []

  const jobs = await railTel.createRailTelScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === railTel.CURRENT_JOBS_URL) return currentJobsHtml
      throw new Error(`Unexpected RailTel URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [railTel.CURRENT_JOBS_URL])
  assert.equal(jobs.length, 3)
  assert.deepEqual(jobs[0], {
    title: 'DEPUTATION/Re-employment for 1 post of Junior Translator/ E-0 at Corporate Office, Delhi',
    company: 'RailTel',
    department: null,
    location: 'Corporate Office, Delhi, India',
    city: 'Corporate Office',
    country: 'India',
    jobId: 'deputation-re-employment-for-1-post-of-junior-translator-e-0-at-corporate-office-delhi',
    requisitionId: 'deputation-re-employment-for-1-post-of-junior-translator-e-0-at-corporate-office-delhi',
    sourceUrl: 'https://www.railtel.in/images/careers/JR%20translator%20Vacancy%20notice%20dt%2015072026.pdf',
    applyUrl: 'https://www.railtel.in/images/careers/JR%20translator%20Vacancy%20notice%20dt%2015072026.pdf',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'DEPUTATION/Re-employment for 1 post of Junior Translator/ E-0 at Corporate Office, Delhi',
    remoteStatus: null,
    source: 'railtel',
    link: 'https://www.railtel.in/images/careers/JR%20translator%20Vacancy%20notice%20dt%2015072026.pdf',
    scrapedAt: FIXED_SCRAPED_AT,
  })
  assert.equal(jobs[1].employmentType, 'Full-time')
  assert.equal(jobs[1].applyUrl, 'https://cdn.digialm.com/EForms/configuredHtml/1258/94400/Index.html')
  assert.equal(jobs[2].employmentType, 'Contract')
})

test('RailTel fails closed when the verified first-party page drifts or no longer exposes vacancy tables', async () => {
  const railTel = await loadRailTelModule()

  await assert.rejects(
    railTel.createRailTelScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified current openings page/i,
  )

  await assert.rejects(
    railTel.createRailTelScraper().run({
      fetchText: async () =>
        currentJobsHtml.replaceAll('class="railtel_table"', 'class="other_table"'),
    }),
    /vacancy tables/i,
  )
})
