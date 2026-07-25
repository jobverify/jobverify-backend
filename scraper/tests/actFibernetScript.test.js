import assert from 'node:assert/strict'
import test from 'node:test'

const loadActFibernetModule = async () => {
  try {
    return await import('../actfibernet/script.js')
  } catch {
    assert.fail('Expected Act Fibernet scraper module at ../actfibernet/script.js')
  }
}

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>explore Exciting Job Opportunities And Benefits At Act Fibernet | Act Fibernet</title>
    <link rel="canonical" href="https://www.actcorp.in/careers">
  </head>
  <body>
    <main>
      <h1>Why join ACT</h1>
      <section>
        <h2>Get exciting job opportunities and attractive benefits at ACT Fibernet</h2>
        <p>Discover opportunities that match your ambition</p>
        <p>explore our current job openings.</p>
        <a href="https://careers.ap-1.fountain.com/act/84eee9cf-de39-4f45-9e65-02c4c9154dd5">EXPLORE JOB OPENINGS</a>
      </section>
    </main>
  </body>
</html>
`

const renderedFountainCards = [
  {
    title: 'Hyderabad - Executive/Senior Executive-Retail Sales-Retail Sales',
    location: 'Hyderabad',
    department: null,
    href: null,
  },
  {
    title: 'Hyderabad - Team Lead-Enterprise Business-EB Collection & Retention',
    location: 'Hyderabad',
    department: null,
    href: null,
  },
  {
    title: 'Regional Manager',
    location: 'Dubai, United Arab Emirates',
    department: 'Operations',
    href: null,
  },
]

test('Act Fibernet pins the verified official ACT careers handoff to the public Fountain board', async () => {
  const actFibernet = await loadActFibernetModule()

  assert.equal(actFibernet.SOURCE, 'actfibernet')
  assert.equal(actFibernet.COMPANY, 'Act Fibernet')
  assert.equal(actFibernet.OFFICIAL_BRAND_NAME, 'ACT Fibernet')
  assert.equal(actFibernet.VERIFIED_ON, '2026-07-14')
  assert.equal(actFibernet.CAREERS_PAGE_URL, 'https://www.actcorp.in/careers')
  assert.equal(
    actFibernet.FOUNTAIN_BOARD_URL,
    'https://careers.ap-1.fountain.com/act/84eee9cf-de39-4f45-9e65-02c4c9154dd5',
  )
  assert.equal(actFibernet.JOB_CARD_TITLE_SELECTOR, 'button h3')
  assert.equal(actFibernet.hasActFibernetCareersSignal(careersPageHtml), true)
  assert.equal(actFibernet.hasActFibernetCareersSignal('<main>Careers</main>'), false)
})

test('extractFountainJobs keeps and normalizes rendered India roles from the ACT Fountain board', async () => {
  const actFibernet = await loadActFibernetModule()

  assert.deepEqual(actFibernet.extractFountainJobs(renderedFountainCards), [
    {
      title: 'Executive/Senior Executive-Retail Sales-Retail Sales',
      company: 'Act Fibernet',
      department: null,
      location: 'Hyderabad, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'hyderabad-executive-senior-executive-retail-sales-retail-sales',
      requisitionId: 'hyderabad-executive-senior-executive-retail-sales-retail-sales',
      sourceUrl: 'https://careers.ap-1.fountain.com/act/84eee9cf-de39-4f45-9e65-02c4c9154dd5#hyderabad-executive-senior-executive-retail-sales-retail-sales',
      applyUrl: 'https://careers.ap-1.fountain.com/act/84eee9cf-de39-4f45-9e65-02c4c9154dd5#hyderabad-executive-senior-executive-retail-sales-retail-sales',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    },
    {
      title: 'Team Lead-Enterprise Business-EB Collection & Retention',
      company: 'Act Fibernet',
      department: null,
      location: 'Hyderabad, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'hyderabad-team-lead-enterprise-business-eb-collection-retention',
      requisitionId: 'hyderabad-team-lead-enterprise-business-eb-collection-retention',
      sourceUrl: 'https://careers.ap-1.fountain.com/act/84eee9cf-de39-4f45-9e65-02c4c9154dd5#hyderabad-team-lead-enterprise-business-eb-collection-retention',
      applyUrl: 'https://careers.ap-1.fountain.com/act/84eee9cf-de39-4f45-9e65-02c4c9154dd5#hyderabad-team-lead-enterprise-business-eb-collection-retention',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    },
  ])
})

test('run validates the ACT careers page, loads the public Fountain board, and adds scraper metadata', async () => {
  const actFibernet = await loadActFibernetModule()
  const events = []
  const page = {
    async goto(url) {
      events.push(`goto:${url}`)
    },
    async waitForSelector(selector) {
      events.push(`wait:${selector}`)
    },
    async evaluate(callback) {
      events.push('expand')
      return false
    },
    async $$eval(selector) {
      events.push(`extract:${selector}`)
      return renderedFountainCards
    },
  }
  const browser = {
    async close() {
      events.push('close')
    },
  }
  const scraper = actFibernet.createActFibernetScraper({ maxJobs: 1 })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      events.push(`careers:${url}`)
      return careersPageHtml
    },
    launchBrowser: async () => browser,
    createPage: async () => page,
  })

  assert.deepEqual(events, [
    `careers:${actFibernet.CAREERS_PAGE_URL}`,
    `goto:${actFibernet.FOUNTAIN_BOARD_URL}`,
    `wait:${actFibernet.JOB_CARD_TITLE_SELECTOR}`,
    'expand',
    `extract:${actFibernet.JOB_CARD_TITLE_SELECTOR}`,
    'close',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'actfibernet')
  assert.equal(
    jobs[0].link,
    'https://careers.ap-1.fountain.com/act/84eee9cf-de39-4f45-9e65-02c4c9154dd5#hyderabad-executive-senior-executive-retail-sales-retail-sales',
  )
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('run rejects an ACT careers page that does not link to the verified public Fountain board', async () => {
  const actFibernet = await loadActFibernetModule()
  const scraper = actFibernet.createActFibernetScraper()

  await assert.rejects(
    scraper.run({ fetchText: async () => '<h1>Careers</h1>' }),
    /does not match the expected official ACT Fibernet careers page structure/i,
  )
})
