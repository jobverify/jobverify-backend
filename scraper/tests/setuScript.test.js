import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-26T00:00:00.000Z'

const staticCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Setu | Join Our Fintech Team</title>
  </head>
  <body>
    <main>
      <h1>Come tackle India's toughest fintech problems with an exceptional set of people.</h1>
      <p>We are completely overhauling our country's dated fintech architecture.</p>
      <h2>Current openings</h2>
      <p>Fetching open roles...</p>
      <footer>(c) 2026 BrokenTusk Technologies Pvt. Ltd</footer>
    </main>
  </body>
</html>
`

const currentOpeningsCsv = `Role,Description,Link,Category,Sub-category
SDE - II Fullstack Engineer,https://docs.google.com/document/d/fullstack/edit,https://pinelabsgroup.turbohire.co/get/RFZUclV,Engineering,Payments
SDE - II Backend Engineer,https://docs.google.com/document/d/backend/edit,https://pinelabsgroup.turbohire.co/get/bGFRMGN,Engineering,Payments
Data Engineer,https://drive.google.com/file/d/data/view,https://pinelabsgroup.turbohire.co/get/aDFnNUx,Engineering,Data
`

const categoryDescriptionsCsv = `Category,Description
Engineering,"Engineering the structural system, the payload, the guidance, and the propulsion systems to build a financial rocketship at Setu."
Payments,Build core infrastructure to enable payments to businesses.
Data,Enable a solution for businesses to analyse financial data of customers.
`

const loadModule = async () => {
  try {
    return await import('../setu/script.js')
  } catch {
    assert.fail('Expected Setu scraper module at ../setu/script.js')
  }
}

test('Setu helpers stay pinned to the verified official careers shell and CSV-backed openings contract', async () => {
  const setu = await loadModule()

  assert.equal(setu.SOURCE, 'setu')
  assert.equal(setu.COMPANY_NAME, 'Setu')
  assert.equal(setu.OFFICIAL_BRAND_NAME, 'BrokenTusk Technologies Pvt. Ltd.')
  assert.equal(setu.VERIFIED_ON, '2026-07-26')
  assert.equal(setu.CAREERS_URL, 'https://setu.co/careers/')
  assert.equal(
    setu.CURRENT_OPENINGS_CSV_URL,
    'https://raw.githubusercontent.com/SetuHQ/website-content/refs/heads/main/careers/Setu%20Website%20-%20CurrentOpenings.csv',
  )
  assert.equal(
    setu.CATEGORY_DESCRIPTIONS_CSV_URL,
    'https://raw.githubusercontent.com/SetuHQ/website-content/refs/heads/main/careers/Setu%20Website%20-%20CategoryDescriptions.csv',
  )
  assert.equal(setu.hasOfficialCareersSignal(staticCareersHtml), true)
  assert.equal(setu.hasPlaceholderOpeningsSignal(staticCareersHtml), true)
  assert.equal(setu.hasCurrentOpeningsCsvSignal(currentOpeningsCsv), true)
  assert.equal(setu.hasCategoryDescriptionsCsvSignal(categoryDescriptionsCsv), true)
  assert.deepEqual(setu.extractJobsFromCsv(currentOpeningsCsv, categoryDescriptionsCsv), [
    {
      jobId: 'RFZUclV',
      title: 'SDE - II Fullstack Engineer',
      department: 'Engineering',
      location: 'India',
      city: null,
      country: 'India',
      sourceUrl: 'https://pinelabsgroup.turbohire.co/get/RFZUclV',
      applyUrl: 'https://pinelabsgroup.turbohire.co/get/RFZUclV',
      jobDescription: 'Build core infrastructure to enable payments to businesses.',
    },
    {
      jobId: 'bGFRMGN',
      title: 'SDE - II Backend Engineer',
      department: 'Engineering',
      location: 'India',
      city: null,
      country: 'India',
      sourceUrl: 'https://pinelabsgroup.turbohire.co/get/bGFRMGN',
      applyUrl: 'https://pinelabsgroup.turbohire.co/get/bGFRMGN',
      jobDescription: 'Build core infrastructure to enable payments to businesses.',
    },
    {
      jobId: 'aDFnNUx',
      title: 'Data Engineer',
      department: 'Engineering',
      location: 'India',
      city: null,
      country: 'India',
      sourceUrl: 'https://pinelabsgroup.turbohire.co/get/aDFnNUx',
      applyUrl: 'https://pinelabsgroup.turbohire.co/get/aDFnNUx',
      jobDescription: 'Enable a solution for businesses to analyse financial data of customers.',
    },
  ])
})

test('Setu run validates the official careers page and extracts openings from the verified CSV contract', async () => {
  const setu = await loadModule()
  const requestedTexts = []

  const jobs = await setu.createSetuScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      if (url === setu.CAREERS_URL) return staticCareersHtml
      if (url === setu.CURRENT_OPENINGS_CSV_URL) return currentOpeningsCsv
      if (url === setu.CATEGORY_DESCRIPTIONS_CSV_URL) return categoryDescriptionsCsv
      throw new Error(`Unexpected Setu URL: ${url}`)
    },
  })

  assert.deepEqual(requestedTexts, [
    setu.CAREERS_URL,
    setu.CURRENT_OPENINGS_CSV_URL,
    setu.CATEGORY_DESCRIPTIONS_CSV_URL,
  ])
  assert.equal(jobs.length, 3)
  assert.deepEqual(jobs[0], {
    title: 'SDE - II Fullstack Engineer',
    company: 'Setu',
    department: 'Engineering',
    location: 'India',
    city: null,
    country: 'India',
    jobId: 'RFZUclV',
    requisitionId: null,
    sourceUrl: 'https://pinelabsgroup.turbohire.co/get/RFZUclV',
    applyUrl: 'https://pinelabsgroup.turbohire.co/get/RFZUclV',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Build core infrastructure to enable payments to businesses.',
    source: 'setu',
    link: 'https://pinelabsgroup.turbohire.co/get/RFZUclV',
    scrapedAt: FIXED_SCRAPED_AT,
  })
  assert.equal(jobs[1].title, 'SDE - II Backend Engineer')
  assert.equal(jobs[2].title, 'Data Engineer')
})

test('Setu fails closed when the official careers shell or verified CSV contracts drift materially', async () => {
  const setu = await loadModule()

  await assert.rejects(
    setu.createSetuScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified setu careers page/i,
  )

  await assert.rejects(
    setu.createSetuScraper().run({
      fetchText: async (url) => {
        if (url === setu.CAREERS_URL) return staticCareersHtml
        if (url === setu.CURRENT_OPENINGS_CSV_URL) return 'Role,Link\nBroken\n'
        return categoryDescriptionsCsv
      },
    }),
    /current openings csv/i,
  )

  await assert.rejects(
    setu.createSetuScraper().run({
      fetchText: async (url) => {
        if (url === setu.CAREERS_URL) return staticCareersHtml
        if (url === setu.CURRENT_OPENINGS_CSV_URL) return currentOpeningsCsv
        return 'Category,Description\nProduct,\n'
      },
    }),
    /category descriptions csv/i,
  )
})
