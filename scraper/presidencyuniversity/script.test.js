import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  COMPANY_NAME,
  HRONE_VACANCIES_URL,
  SOURCE,
  createPresidencyUniversityScraper,
  extractHrOneJobs,
  extractTrustedApplyPid,
  extractVacanciesBoardUrl,
  extractVacancyCards,
  hasOfficialCareersSignal,
  isTrustedBoardPageUrl,
} from './script.js'

const directHrOneBoardUrl =
  'https://career.hrone.cloud/career-portal?appId=i-1ZSLehiu226AHFQVbzeMDkGYFMTIRfsjt9lUu6eKDPO8PmcYlH2iMTYmBNnLgGTJ76WhrZ9wrB3cljQGz-tXkUpSYrZJH0ibCY0ULtGqQHxPDKgw8SptRM0rrp857j&dc=presidency&rqt=m8jH4bpBQbccEU8MZpSP5Q&cc=Jpj2OLMqPsPorue5M3XT_A'

const officialCareersHtml = `
  <html lang="en">
    <head>
      <title>Careers</title>
      <meta name="description" content="At Presidency University we are committed to building a workplace that fosters innovation and collaboration.">
      <meta name="keywords" content="Presidency University">
    </head>
    <body>
      <section>
        <h2>Current vacancies</h2>
        <div class="vacancy-boxes-wrap">
          <div class="vacancy-boxes">
            <div class="vacancy-box-top">
              <h3>Assistant Professor - CSE</h3>
              <p>Job function: Education</p>
              <p>Experience: 2 - 5</p>
              <p>Number of openings: 100</p>
              <p>Preferred work mode: Work from office</p>
              <p>Job location: Bengaluru</p>
            </div>
            <div class="vacancy-box-bottom">
              <a
                class="download-button-link white-link"
                href="https://career.hrone.cloud/apply-job?appId=i-1ZSLehiu226AHFQVbzeMDkGYFMTIRfsjt9lUu6eKDPO8PmcYlH2iMTYmBNnLgGTJ76WhrZ9wrB3cljQGz-tXkUpSYrZJH0ibCY0ULtGqQHxPDKgw8SptRM0rrp857j&amp;dc=presidency&amp;rqt=m8jH4bpBQbccEU8MZpSP5Q&amp;cc=Jpj2OLMqPsPorue5M3XT_A&amp;pid=qeyloSzhxH2-qK4vv_WogQ&amp;dptc=r0_XPJmvFT_oCLGRN8jpfg&amp;st=-n_C2-YChNaZnubp3_OPew&amp;fm=CR&amp;headerColor=%23110037&amp;fontSize=&amp;buttonColor=%23070037"
                target="_blank"
                rel="noopener"
              >
                Apply Here
              </a>
            </div>
          </div>
          <div class="vacancy-boxes">
            <div class="vacancy-box-top">
              <h3>Dean - Research</h3>
              <p>Job function: Administrative</p>
              <p>Experience: 15 - 20</p>
              <p>Number of openings: 1</p>
            </div>
            <div class="vacancy-box-bottom">
              <a
                class="download-button-link white-link"
                href="https://career.hrone.cloud/apply-job?appId=i-1ZSLehiu226AHFQVbzeMDkGYFMTIRfsjt9lUu6eKDPO8PmcYlH2iMTYmBNnLgGTJ76WhrZ9wrB3cljQGz-tXkUpSYrZJH0ibCY0ULtGqQHxPDKgw8SptRM0rrp857j&amp;dc=presidency&amp;rqt=m8jH4bpBQbccEU8MZpSP5Q&amp;cc=Jpj2OLMqPsPorue5M3XT_A&amp;pid=TKkqq_e6uK0uBEsUkYg_mA&amp;dptc=r0_XPJmvFT_oCLGRN8jpfg&amp;st=-n_C2-YChNaZnubp3_OPew&amp;fm=CR&amp;headerColor=%23110037&amp;fontSize=&amp;buttonColor=%23070037"
                target="_blank"
                rel="noopener"
              >
                Apply Here
              </a>
            </div>
          </div>
        </div>
        <a href="https://hr-1.in/b42a6e" class="new_design_btn" target="_blank" rel="noopener">
          See All Vacancies
        </a>
      </section>
    </body>
  </html>
`

const extractedCards = [
  {
    title: 'Assistant Professor - CSE',
    requisitionId: 'qeyloSzhxH2-qK4vv_WogQ',
    jobFunction: 'Education',
    experience: '2 - 5',
    openings: '100',
    workMode: 'Work from office',
    location: 'Bengaluru',
    applyUrl:
      'https://career.hrone.cloud/apply-job?appId=i-1ZSLehiu226AHFQVbzeMDkGYFMTIRfsjt9lUu6eKDPO8PmcYlH2iMTYmBNnLgGTJ76WhrZ9wrB3cljQGz-tXkUpSYrZJH0ibCY0ULtGqQHxPDKgw8SptRM0rrp857j&dc=presidency&rqt=m8jH4bpBQbccEU8MZpSP5Q&cc=Jpj2OLMqPsPorue5M3XT_A&pid=qeyloSzhxH2-qK4vv_WogQ&dptc=r0_XPJmvFT_oCLGRN8jpfg&st=-n_C2-YChNaZnubp3_OPew&fm=CR&headerColor=%23110037&fontSize=&buttonColor=%23070037',
  },
  {
    title: 'Dean - Research',
    requisitionId: 'TKkqq_e6uK0uBEsUkYg_mA',
    jobFunction: 'Administrative',
    experience: '15 - 20',
    openings: '1',
    workMode: null,
    location: null,
    applyUrl:
      'https://career.hrone.cloud/apply-job?appId=i-1ZSLehiu226AHFQVbzeMDkGYFMTIRfsjt9lUu6eKDPO8PmcYlH2iMTYmBNnLgGTJ76WhrZ9wrB3cljQGz-tXkUpSYrZJH0ibCY0ULtGqQHxPDKgw8SptRM0rrp857j&dc=presidency&rqt=m8jH4bpBQbccEU8MZpSP5Q&cc=Jpj2OLMqPsPorue5M3XT_A&pid=TKkqq_e6uK0uBEsUkYg_mA&dptc=r0_XPJmvFT_oCLGRN8jpfg&st=-n_C2-YChNaZnubp3_OPew&fm=CR&headerColor=%23110037&fontSize=&buttonColor=%23070037',
  },
]

test('Presidency University pins the official careers handoff and parses inline trusted vacancy cards', () => {
  assert.equal(CAREERS_URL, 'https://presidencyuniversity.in/careers')
  assert.equal(HRONE_VACANCIES_URL, 'https://hr-1.in/b42a6e')
  assert.equal(hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(extractVacanciesBoardUrl(officialCareersHtml), HRONE_VACANCIES_URL)
  assert.equal(isTrustedBoardPageUrl(directHrOneBoardUrl), true)
  assert.equal(isTrustedBoardPageUrl('https://example.com/jobs'), false)
  assert.equal(
    extractTrustedApplyPid(
      'https://career.hrone.cloud/apply-job?appId=i-1ZSLehiu226AHFQVbzeMDkGYFMTIRfsjt9lUu6eKDPO8PmcYlH2iMTYmBNnLgGTJ76WhrZ9wrB3cljQGz-tXkUpSYrZJH0ibCY0ULtGqQHxPDKgw8SptRM0rrp857j&dc=presidency&rqt=m8jH4bpBQbccEU8MZpSP5Q&cc=Jpj2OLMqPsPorue5M3XT_A&pid=qeyloSzhxH2-qK4vv_WogQ',
    ),
    'qeyloSzhxH2-qK4vv_WogQ',
  )

  assert.deepEqual(extractVacancyCards(officialCareersHtml), extractedCards)
  assert.deepEqual(extractHrOneJobs(extractedCards), [
    {
      title: 'Assistant Professor - CSE',
      company: 'Presidency University',
      department: 'Education',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: 'qeyloSzhxH2-qK4vv_WogQ',
      requisitionId: 'qeyloSzhxH2-qK4vv_WogQ',
      sourceUrl:
        'https://career.hrone.cloud/apply-job?appId=i-1ZSLehiu226AHFQVbzeMDkGYFMTIRfsjt9lUu6eKDPO8PmcYlH2iMTYmBNnLgGTJ76WhrZ9wrB3cljQGz-tXkUpSYrZJH0ibCY0ULtGqQHxPDKgw8SptRM0rrp857j&dc=presidency&rqt=m8jH4bpBQbccEU8MZpSP5Q&cc=Jpj2OLMqPsPorue5M3XT_A&pid=qeyloSzhxH2-qK4vv_WogQ&dptc=r0_XPJmvFT_oCLGRN8jpfg&st=-n_C2-YChNaZnubp3_OPew&fm=CR&headerColor=%23110037&fontSize=&buttonColor=%23070037',
      applyUrl:
        'https://career.hrone.cloud/apply-job?appId=i-1ZSLehiu226AHFQVbzeMDkGYFMTIRfsjt9lUu6eKDPO8PmcYlH2iMTYmBNnLgGTJ76WhrZ9wrB3cljQGz-tXkUpSYrZJH0ibCY0ULtGqQHxPDKgw8SptRM0rrp857j&dc=presidency&rqt=m8jH4bpBQbccEU8MZpSP5Q&cc=Jpj2OLMqPsPorue5M3XT_A&pid=qeyloSzhxH2-qK4vv_WogQ&dptc=r0_XPJmvFT_oCLGRN8jpfg&st=-n_C2-YChNaZnubp3_OPew&fm=CR&headerColor=%23110037&fontSize=&buttonColor=%23070037',
      employmentType: null,
      experienceRequired: '2 - 5',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription:
        'Job function: Education. Experience(years): 2 - 5. Number of openings: 100. Preferred work mode: Work from office. Job location: Bengaluru, India.',
    },
    {
      title: 'Dean - Research',
      company: 'Presidency University',
      department: 'Administrative',
      location: null,
      city: null,
      country: 'India',
      jobId: 'TKkqq_e6uK0uBEsUkYg_mA',
      requisitionId: 'TKkqq_e6uK0uBEsUkYg_mA',
      sourceUrl:
        'https://career.hrone.cloud/apply-job?appId=i-1ZSLehiu226AHFQVbzeMDkGYFMTIRfsjt9lUu6eKDPO8PmcYlH2iMTYmBNnLgGTJ76WhrZ9wrB3cljQGz-tXkUpSYrZJH0ibCY0ULtGqQHxPDKgw8SptRM0rrp857j&dc=presidency&rqt=m8jH4bpBQbccEU8MZpSP5Q&cc=Jpj2OLMqPsPorue5M3XT_A&pid=TKkqq_e6uK0uBEsUkYg_mA&dptc=r0_XPJmvFT_oCLGRN8jpfg&st=-n_C2-YChNaZnubp3_OPew&fm=CR&headerColor=%23110037&fontSize=&buttonColor=%23070037',
      applyUrl:
        'https://career.hrone.cloud/apply-job?appId=i-1ZSLehiu226AHFQVbzeMDkGYFMTIRfsjt9lUu6eKDPO8PmcYlH2iMTYmBNnLgGTJ76WhrZ9wrB3cljQGz-tXkUpSYrZJH0ibCY0ULtGqQHxPDKgw8SptRM0rrp857j&dc=presidency&rqt=m8jH4bpBQbccEU8MZpSP5Q&cc=Jpj2OLMqPsPorue5M3XT_A&pid=TKkqq_e6uK0uBEsUkYg_mA&dptc=r0_XPJmvFT_oCLGRN8jpfg&st=-n_C2-YChNaZnubp3_OPew&fm=CR&headerColor=%23110037&fontSize=&buttonColor=%23070037',
      employmentType: null,
      experienceRequired: '15 - 20',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription:
        'Job function: Administrative. Experience(years): 15 - 20. Number of openings: 1.',
    },
  ])
})

test('extractHrOneJobs fails closed on untrusted apply links', () => {
  assert.throws(
    () => extractHrOneJobs([
      {
        ...extractedCards[0],
        applyUrl: 'https://example.com/apply',
      },
    ]),
    /trusted public apply metadata/i,
  )
})

test('run validates the official Presidency University surface and decorates inline vacancies without browser hooks', async () => {
  const events = []
  const scraper = createPresidencyUniversityScraper({ maxJobs: 1 })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      events.push(url)
      return officialCareersHtml
    },
    now: () => '2026-08-08T20:00:00.000Z',
  })

  assert.deepEqual(events, [CAREERS_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, COMPANY_NAME)
  assert.equal(jobs[0].source, SOURCE)
  assert.equal(
    jobs[0].link,
    'https://career.hrone.cloud/apply-job?appId=i-1ZSLehiu226AHFQVbzeMDkGYFMTIRfsjt9lUu6eKDPO8PmcYlH2iMTYmBNnLgGTJ76WhrZ9wrB3cljQGz-tXkUpSYrZJH0ibCY0ULtGqQHxPDKgw8SptRM0rrp857j&dc=presidency&rqt=m8jH4bpBQbccEU8MZpSP5Q&cc=Jpj2OLMqPsPorue5M3XT_A&pid=qeyloSzhxH2-qK4vv_WogQ&dptc=r0_XPJmvFT_oCLGRN8jpfg&st=-n_C2-YChNaZnubp3_OPew&fm=CR&headerColor=%23110037&fontSize=&buttonColor=%23070037',
  )
  assert.equal(jobs[0].scrapedAt, '2026-08-08T20:00:00.000Z')
})

test('run fails closed when the official careers page no longer matches the verified surface', async () => {
  const scraper = createPresidencyUniversityScraper()

  await assert.rejects(
    scraper.run({
      fetchText: async () => '<main><h1>Careers</h1></main>',
    }),
    /verified official careers surface/i,
  )

  await assert.rejects(
    scraper.run({
      fetchText: async () => officialCareersHtml.replace(HRONE_VACANCIES_URL, 'https://example.com/jobs'),
    }),
    /verified public HROne vacancies surface/i,
  )

  await assert.rejects(
    scraper.run({
      fetchText: async () => officialCareersHtml.replace(/vacancy-box/g, 'vacancy-card'),
    }),
    /verified official careers surface|trusted inline vacancy cards/i,
  )
})
