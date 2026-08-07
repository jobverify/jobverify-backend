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

      <!--
      <table width="100" border="0" cellpadding="0" cellspacing="0" class="railtel_table">
        <tbody>
          <tr class="heading">
            <td>Commented historical vacancy that should not be scraped</td>
          </tr>
          <tr>
            <td><a title="download" href="/images/careers/old-commented-notice.pdf" target="_blank">Detailed Vacancy Notice</a></td>
          </tr>
        </tbody>
      </table>
      -->
    </div>
  </body>
</html>
`

const medicalConsultantSelectionHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Current Job Openings</title>
  </head>
  <body>
    <table width="100" border="0" cellpadding="0" cellspacing="0" class="railtel_table">
      <tbody>
        <tr class="heading">
          <td>Engagement of Experienced Medical Consultant for BHISHM Cube Project on Contract Basis.</td>
        </tr>
        <tr>
          <td><a title="download" href="/images/careers/Interview Notice - Medical consultant.pdf" target="_blank">List of Provisionally Shortlisted Candidates for Interview</a></td>
        </tr>
        <tr>
          <td><a title="download" href="/images/careers/Final Vacancy Notice for BHISHM Cube Project.pdf" target="_blank">Detailed Vacancy Notice for Experienced Medical Consultant for BHISHM Cube Project on Contract Basis</a></td>
        </tr>
      </tbody>
    </table>
    <table width="100" border="0" cellpadding="0" cellspacing="0" class="railtel_table">
      <tbody>
        <tr class="heading">
          <td>Recruitment of Dy. Manager/Finance (E-1 Level) - ICAI Campus Selection Program</td>
        </tr>
        <tr>
          <td><a title="download" href="/images/careers/ICAI" target="_blank">List of candidates provisionally empanelled for recruitment on the post of Dy. Manager/Finance (E-1 Level)</a></td>
        </tr>
      </tbody>
    </table>
    <table width="100" border="0" cellpadding="0" cellspacing="0" class="railtel_table">
      <tbody>
        <tr class="heading">
          <td>SC/ST Certificate</td>
        </tr>
        <tr>
          <td><a title="download" href="/images/careers/ST Certificate.pdf" target="_blank">Format for SC/ST Certificate</a></td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`

const quotedHrefHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Current Job Openings</title>
  </head>
  <body>
    <table width="100" border="0" cellpadding="0" cellspacing="0" class="railtel_table">
      <tbody>
        <tr class="heading">
          <td>Recruitment of Technical personnel for HSWAN project on contractual basis</td>
        </tr>
        <tr>
          <td><a title="download" href="/images/careers/Vacancy Notice -RailTel's Website (6).pdf" target="_blank">Notice for recruitment of Technical on contract basis for HSWAN project</a></td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`

const minimumEligibilityListingHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Current Job Openings</title>
  </head>
  <body>
    <p>Junior Translator</p>
    <p>Detailed Vacancy Notice No. RCIL/2025/P&A/44/3</p>
    <p>Click here to apply</p>
    <table width="100" border="0" cellpadding="0" cellspacing="0" class="railtel_table">
      <tbody>
        <tr class="heading">
          <td>Deputation on the post of Sr. Manager/Manager/Dy. Manager/SR/RCIL</td>
        </tr>
        <tr>
          <td><a title="download" href="/images/careers/Vacancy Notice No for Sr Mgr-Mgr-Dy Mgr(Tech)SR.pdf" target="_blank">Detailed Vacancy Notice</a></td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`

const ageOnlyRailTelNoticeText = `
RailTel Corporation of India Ltd.
Title & No. of Posts Design Director (Chief Manager / Sr. Manager) - One Post
Term of Appointment Re-employment
Age should not exceed 62 years on the closing date of receipt of application.
Closing Date 30 days from the date of issue.
Candidates may apply through proper channel.
`

const serviceEligibilityRailTelNoticeText = `
RailTel Corporation of India Ltd.
Title & No of Posts Sr. Manager/Manager/Dy. Manager (Tech) - 06 Posts
Specific Requirements:
Proficiency and expertise in railway signalling and telecom works.
Minimum Eligibility:
For Sr. Manager - Working in Level-8 (7th CPC)
For Manager - 4 years working in Level-7 (7th CPC)
For Dy. Manager - Working in Level-7 (7th CPC)
Note cut off date for age and eligibility would be reckoned as on closing date of vacancy notice.
`

const garbledRailTelOcrText = `
AV Internation! Year \\ 0 <A 2025 ©f Cooperatives : im —— Seater Rid ge: 07/202 RAILTEL Yereel ide 3th
SRN f¥i/ RAILTEL CORPORATION OF INDIA LTD a Aer & 1¢fi WId/IuHH &7.PSU UNDER MINISTRY OF RAILWAYS
No. RCIL-COOHR(RENG)/1/2026-(Comp No. 53638 ) Tei 13.03.2026
Detailed Vacancy notice for 2 Posts of Jr Translator (E-0) Rajbhasha
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

test('RailTel extractor prefers detailed vacancy notices and skips result-only or support-only rows', async () => {
  const railTel = await loadRailTelModule()

  const jobs = railTel.extractCurrentJobs(medicalConsultantSelectionHtml)

  assert.deepEqual(jobs, [
    {
      title: 'Engagement of Experienced Medical Consultant for BHISHM Cube Project on Contract Basis.',
      location: null,
      city: null,
      country: 'India',
      jobId: 'engagement-of-experienced-medical-consultant-for-bhishm-cube-project-on-contract-basis',
      requisitionId: 'engagement-of-experienced-medical-consultant-for-bhishm-cube-project-on-contract-basis',
      sourceUrl: 'https://www.railtel.in/images/careers/Final%20Vacancy%20Notice%20for%20BHISHM%20Cube%20Project.pdf',
      applyUrl: 'https://www.railtel.in/images/careers/Final%20Vacancy%20Notice%20for%20BHISHM%20Cube%20Project.pdf',
      employmentType: 'Contract',
      jobDescription:
        'Detailed Vacancy Notice for Experienced Medical Consultant for BHISHM Cube Project on Contract Basis',
      remoteStatus: null,
    },
  ])
})

test('RailTel extractor ignores commented tables and keeps apostrophes inside double-quoted notice href values', async () => {
  const railTel = await loadRailTelModule()

  const commentedJobs = railTel.extractCurrentJobs(currentJobsHtml)
  assert.equal(commentedJobs.some((job) => job.title === 'Commented historical vacancy that should not be scraped'), false)

  const quotedHrefJobs = railTel.extractCurrentJobs(quotedHrefHtml)
  assert.deepEqual(quotedHrefJobs, [
    {
      title: 'Recruitment of Technical personnel for HSWAN project on contractual basis',
      location: null,
      city: null,
      country: 'India',
      jobId: 'recruitment-of-technical-personnel-for-hswan-project-on-contractual-basis',
      requisitionId: 'recruitment-of-technical-personnel-for-hswan-project-on-contractual-basis',
      sourceUrl: "https://www.railtel.in/images/careers/Vacancy%20Notice%20-RailTel's%20Website%20(6).pdf",
      applyUrl: "https://www.railtel.in/images/careers/Vacancy%20Notice%20-RailTel's%20Website%20(6).pdf",
      employmentType: 'Contract',
      jobDescription: 'Notice for recruitment of Technical on contract basis for HSWAN project',
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
    description:
      'DEPUTATION/Re-employment for 1 post of Junior Translator/ E-0 at Corporate Office, Delhi',
    jobDescription:
      'DEPUTATION/Re-employment for 1 post of Junior Translator/ E-0 at Corporate Office, Delhi',
    remoteStatus: null,
    publicExperienceChecked: false,
    source: 'railtel',
    link: 'https://www.railtel.in/images/careers/JR%20translator%20Vacancy%20notice%20dt%2015072026.pdf',
    scrapedAt: FIXED_SCRAPED_AT,
  })
  assert.equal(jobs[1].employmentType, 'Full-time')
  assert.equal(jobs[1].applyUrl, 'https://cdn.digialm.com/EForms/configuredHtml/1258/94400/Index.html')
  assert.equal(jobs[2].employmentType, 'Contract')
})

test('RailTel run enriches experience from linked vacancy notices when machine-readable detail text is available', async () => {
  const railTel = await loadRailTelModule()
  const requestedListingUrls = []
  const requestedNoticeUrls = []

  const jobs = await railTel.createRailTelScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedListingUrls.push(url)
      if (url === railTel.CURRENT_JOBS_URL) return currentJobsHtml
      throw new Error(`Unexpected RailTel listing URL: ${url}`)
    },
    fetchDocumentText: async (url) => {
      requestedNoticeUrls.push(url)
      if (url.endsWith('/FINAL%20VACANCY%20NOTICE-48%20POSTS.pdf')) {
        return 'Qualifications Minimum 2 years of experience in data centre operations.'
      }
      if (url.endsWith('/Vacancy%20Notification%20MPSEDC%20DC%20DR%20PROJECT.pdf')) {
        return 'Required Experience: 5 years in network operations.'
      }
      return ''
    },
  })

  assert.deepEqual(requestedListingUrls, [railTel.CURRENT_JOBS_URL])
  assert.deepEqual(requestedNoticeUrls, [
    'https://www.railtel.in/images/careers/JR%20translator%20Vacancy%20notice%20dt%2015072026.pdf',
    'https://www.railtel.in/images/careers/FINAL%20VACANCY%20NOTICE-48%20POSTS.pdf',
    'https://www.railtel.in/images/careers/Vacancy%20Notification%20MPSEDC%20DC%20DR%20PROJECT.pdf',
  ])
  assert.equal(jobs[1].experienceRequired, '2+ years')
  assert.equal(jobs[1].publicExperienceChecked, true)
  assert.equal(jobs[2].experienceRequired, '5 years')
  assert.equal(jobs[2].publicExperienceChecked, true)
})

test('RailTel run carries forward verified-missing public evidence from vacancy notices even when no numeric experience is stated', async () => {
  const railTel = await loadRailTelModule()

  const jobs = await railTel.createRailTelScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      if (url === railTel.CURRENT_JOBS_URL) return currentJobsHtml
      throw new Error(`Unexpected RailTel listing URL: ${url}`)
    },
    fetchDocumentText: async (url) => {
      if (url.endsWith('/JR%20translator%20Vacancy%20notice%20dt%2015072026.pdf')) {
        return 'Qualifications: Bachelor degree in Hindi with translation proficiency. How to apply: submit the signed application form by post.'
      }
      return ''
    },
  })

  assert.equal(jobs[0].experienceRequired, null)
  assert.equal(jobs[0].publicExperienceChecked, true)
})

test('RailTel run preserves verified vacancy-notice evidence when OCR text is title-matched but garbled', async () => {
  const railTel = await loadRailTelModule()

  const jobs = await railTel.createRailTelScraper({
    maxJobs: 1,
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      if (url === railTel.CURRENT_JOBS_URL) return currentJobsHtml
      throw new Error(`Unexpected RailTel listing URL: ${url}`)
    },
    fetchDocumentText: async (url) => {
      if (url.endsWith('/JR%20translator%20Vacancy%20notice%20dt%2015072026.pdf')) {
        return garbledRailTelOcrText
      }
      return ''
    },
  })

  assert.equal(jobs[0].experienceRequired, null)
  assert.equal(jobs[0].publicExperienceChecked, true)
})

test('RailTel run rejects age-only notices as experience but still extracts minimum service-year eligibility', async () => {
  const railTel = await loadRailTelModule()

  const ageOnlyJobs = await railTel.createRailTelScraper({
    maxJobs: 1,
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      if (url === railTel.CURRENT_JOBS_URL) return currentJobsHtml
      throw new Error(`Unexpected RailTel listing URL: ${url}`)
    },
    fetchDocumentText: async (url) => {
      if (url.endsWith('/JR%20translator%20Vacancy%20notice%20dt%2015072026.pdf')) {
        return ageOnlyRailTelNoticeText
      }
      return ''
    },
  })

  assert.equal(ageOnlyJobs[0].experienceRequired, null)
  assert.equal(ageOnlyJobs[0].publicExperienceChecked, true)

  const serviceEligibilityJobs = await railTel.createRailTelScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      if (url === railTel.CURRENT_JOBS_URL) return minimumEligibilityListingHtml
      throw new Error(`Unexpected RailTel listing URL: ${url}`)
    },
    fetchDocumentText: async (url) => {
      if (url.endsWith('/Vacancy%20Notice%20No%20for%20Sr%20Mgr-Mgr-Dy%20Mgr(Tech)SR.pdf')) {
        return serviceEligibilityRailTelNoticeText
      }
      return ''
    },
  })

  assert.equal(serviceEligibilityJobs[0].experienceRequired, '4 years')
  assert.equal(serviceEligibilityJobs[0].publicExperienceChecked, true)
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
