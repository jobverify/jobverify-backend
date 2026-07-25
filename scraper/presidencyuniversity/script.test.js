import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  COMPANY_NAME,
  HRONE_CARD_SELECTOR,
  HRONE_VACANCIES_URL,
  SOURCE,
  createPresidencyUniversityScraper,
  extractHrOneJobs,
  extractVacanciesBoardUrl,
  hasOfficialCareersSignal,
  isTrustedBoardPageUrl,
  readRenderedHrOneCards,
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
        <div class="vacancy-box">
          <h3>Dean - Research</h3>
          <a
            class="download-button-link white-link"
            href="https://career.hrone.cloud/apply-job?appId=i-1ZSLehiu226AHFQVbzeMDkGYFMTIRfsjt9lUu6eKDPO8PmcYlH2iMTYmBNnLgGTJ76WhrZ9wrB3cljQGz-tXkUpSYrZJH0ibCY0ULtGqQHxPDKgw8SptRM0rrp857j&dc=presidency&rqt=m8jH4bpBQbccEU8MZpSP5Q&cc=Jpj2OLMqPsPorue5M3XT_A&pid=TKkqq_e6uK0uBEsUkYg_mA&dptc=r0_XPJmvFT_oCLGRN8jpfg&st=-n_C2-YChNaZnubp3_OPew&fm=CR&headerColor=%23110037&fontSize=&buttonColor=%23070037"
            target="_blank"
            rel="noopener"
          >
            Apply Here
          </a>
        </div>
        <a href="https://hr-1.in/b42a6e" class="new_design_btn" target="_blank" rel="noopener">
          See All Vacancies
        </a>
      </section>
    </body>
  </html>
`

const renderedCards = [
  {
    title: 'Assistant Professor - CSE',
    requisitionId: 'RE0144',
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
    requisitionId: 'RE0084',
    jobFunction: 'Administrative',
    experience: '15 - 20',
    openings: '1',
    workMode: '-',
    location: '-',
    applyUrl:
      'https://career.hrone.cloud/apply-job?appId=i-1ZSLehiu226AHFQVbzeMDkGYFMTIRfsjt9lUu6eKDPO8PmcYlH2iMTYmBNnLgGTJ76WhrZ9wrB3cljQGz-tXkUpSYrZJH0ibCY0ULtGqQHxPDKgw8SptRM0rrp857j&dc=presidency&rqt=m8jH4bpBQbccEU8MZpSP5Q&cc=Jpj2OLMqPsPorue5M3XT_A&pid=TKkqq_e6uK0uBEsUkYg_mA&dptc=r0_XPJmvFT_oCLGRN8jpfg&st=-n_C2-YChNaZnubp3_OPew&fm=CR&headerColor=%23110037&fontSize=&buttonColor=%23070037',
  },
]

test('Presidency University pins the official careers handoff and normalizes HROne vacancies', () => {
  assert.equal(CAREERS_URL, 'https://presidencyuniversity.in/careers')
  assert.equal(HRONE_VACANCIES_URL, 'https://hr-1.in/b42a6e')
  assert.equal(hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(extractVacanciesBoardUrl(officialCareersHtml), HRONE_VACANCIES_URL)
  assert.equal(isTrustedBoardPageUrl(directHrOneBoardUrl), true)
  assert.equal(isTrustedBoardPageUrl('https://example.com/jobs'), false)

  assert.deepEqual(extractHrOneJobs(renderedCards), [
    {
      title: 'Assistant Professor - CSE',
      company: 'Presidency University',
      department: 'Education',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: 'RE0144',
      requisitionId: 'RE0144',
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
      jobId: 'RE0084',
      requisitionId: 'RE0084',
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
        ...renderedCards[0],
        applyUrl: 'https://example.com/apply',
      },
    ]),
    /trusted public apply metadata/i,
  )
})

test('readRenderedHrOneCards combines rendered HROne job cards with popup-captured apply urls', async () => {
  let popupIndex = 0
  let pendingTargetResolver = null
  const browserTargets = []
  const fakeMainTarget = { id: 'main-target' }
  const popupButtons = renderedCards.map(() => ({
    async click() {
      const currentIndex = popupIndex
      popupIndex += 1
      const popupTarget = {
        opener: () => fakeMainTarget,
        url: () => renderedCards[currentIndex].applyUrl,
      }
      browserTargets.push(popupTarget)
      pendingTargetResolver?.(popupTarget)
    },
  }))

  const page = {
    async waitForFunction() {},
    async evaluate() {
      return false
    },
    async $$eval(selector) {
      if (selector === '.content-box .cls-apply-btn') return renderedCards.length
      if (selector === HRONE_CARD_SELECTOR) {
        return renderedCards.map(({ applyUrl, ...card }) => card)
      }
      throw new Error(`Unexpected selector: ${selector}`)
    },
    async $$(selector) {
      assert.equal(selector, '.content-box .cls-apply-btn')
      return popupButtons
    },
    async bringToFront() {},
    browser() {
      return {
        targets: () => browserTargets,
        waitForTarget: async () => new Promise((resolve) => {
          pendingTargetResolver = resolve
        }),
      }
    },
    target() {
      return fakeMainTarget
    },
  }

  const cards = await readRenderedHrOneCards(page)

  assert.deepEqual(cards, renderedCards)
})

test('run validates the official Presidency University handoff and decorates rendered HROne roles', async () => {
  const events = []
  const page = {
    async goto(url) {
      events.push(`goto:${url}`)
    },
    async waitForSelector(selector) {
      events.push(`wait:${selector}`)
    },
    url() {
      return directHrOneBoardUrl
    },
  }
  const browser = {
    async close() {
      events.push('close')
    },
  }
  const scraper = createPresidencyUniversityScraper({ maxJobs: 1 })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      events.push(`careers:${url}`)
      return officialCareersHtml
    },
    launchBrowser: async () => browser,
    createPage: async () => page,
    readRenderedCards: async (receivedPage) => {
      assert.equal(receivedPage, page)
      events.push('read:cards')
      return renderedCards
    },
  })

  assert.deepEqual(events, [
    `careers:${CAREERS_URL}`,
    `goto:${HRONE_VACANCIES_URL}`,
    `wait:${HRONE_CARD_SELECTOR}`,
    'read:cards',
    'close',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, COMPANY_NAME)
  assert.equal(jobs[0].source, SOURCE)
  assert.equal(jobs[0].link, renderedCards[0].applyUrl)
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
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
})
