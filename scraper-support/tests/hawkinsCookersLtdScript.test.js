import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.resolve(
  currentDir,
  '../../scraper/hawkinscookersltd/fixtures/job-openings.html',
)
const officialJobsHtml = readFileSync(fixturePath, 'utf8')

const loadHawkinsModule = async () => {
  try {
    return await import('../../scraper/hawkinscookersltd/script.js')
  } catch {
    assert.fail('Expected Hawkins Cookers Ltd scraper module at ../../scraper/hawkinscookersltd/script.js')
  }
}

test('Hawkins Cookers Ltd scraper validates the verified first-party jobs page and extracts the canonical openings', async () => {
  const hawkins = await loadHawkinsModule()

  assert.equal(hawkins.SOURCE, 'hawkinscookersltd')
  assert.equal(hawkins.COMPANY, 'Hawkins Cookers Ltd')
  assert.equal(hawkins.HOMEPAGE_URL, 'https://www.hawkinscookers.com/')
  assert.equal(hawkins.CAREERS_URL, 'https://www.hawkinscookers.com/Job_Openings_R.aspx')
  assert.equal(hawkins.hasOfficialJobsSignal(officialJobsHtml), true)

  assert.deepEqual(hawkins.extractOpenings(officialJobsHtml), [
    {
      title: 'Management Trainees',
      department: 'Management Trainees',
      location: 'India',
      city: null,
      sourceUrl: 'https://www.hawkinscookers.com/Job_Openings_R.aspx',
      applyUrl: 'https://www.hawkinscookers.com/Job_Openings_R.aspx',
      employmentType: null,
      descriptionSnippet: 'During Training Rs. 5-12 LPA On Confirmation Rs. 7-14 LPA Fresh Graduates may apply. Persons with relevant experience or from reputed institutes may start higher.',
    },
    {
      title: 'Summer Internship at Hawkins',
      department: 'Internship',
      location: 'India',
      city: null,
      sourceUrl: 'https://www.hawkinscookers.com/Job_Openings_R.aspx',
      applyUrl: 'https://www.hawkinscookers.com/Job_Openings_R.aspx',
      employmentType: 'Internship',
      descriptionSnippet: 'Are you curious, motivated and open to challenging yourself, and enjoy working both independently and as part of a team? If you are eager to apply your classroom learnings practically and gain hands-on experience, this internship is designed for you. Internship Duration Minimum duration: 60 days Preferred duration: 90 days Stipend Details Upto Rs. 25,000/- per month',
    },
    {
      title: 'Apprentices',
      department: 'Apprenticeship',
      location: 'Thane / Hoshiarpur / Jaunpur, India',
      city: null,
      sourceUrl: 'https://www.hawkinscookers.com/Job_Openings_R.aspx',
      applyUrl: 'https://www.hawkinscookers.com/Job_Openings_R.aspx',
      employmentType: 'Apprenticeship',
      descriptionSnippet: 'Hawkins Cookers Ltd. is a professionally managed, public limited, listed Company. Hawkins factories are in Thane, Hoshiarpur and Jaunpur. Apprentices are given exposure in Quality Control, Press Shop, Assembly, Sub-contracting, Process Improvement, Procurement, Tool Room and R&D. Stipend per month during Apprenticeship Graduate Apprentices: Rs. 20,000 / Rs. 18,000 / Rs. 18,000 Diploma Apprentices: Rs. 18,000 / Rs. 16,000 / Rs. 16,000 ITI Apprentices (Trade Apprentices): Rs. 16,000 / Rs. 13,000 / Rs. 13,000',
    },
  ])
})

test('Hawkins Cookers Ltd run decorates the canonical openings with shared scraper metadata', async () => {
  const hawkins = await loadHawkinsModule()

  const requestedUrls = []
  const jobs = await hawkins.createHawkinsCookersLtdScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return officialJobsHtml
    },
  })

  assert.deepEqual(requestedUrls, [hawkins.CAREERS_URL])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].company, 'Hawkins Cookers Ltd')
  assert.equal(jobs[0].source, 'hawkinscookersltd')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[1].employmentType, 'Internship')
  assert.equal(jobs[2].employmentType, 'Apprenticeship')
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('Hawkins Cookers Ltd fails closed when the verified first-party jobs page changes materially', async () => {
  const hawkins = await loadHawkinsModule()

  await assert.rejects(
    hawkins.createHawkinsCookersLtdScraper().run({
      fetchText: async () => '<html><body><h1>Jobs</h1><p>Openings</p></body></html>',
    }),
    /verified official Hawkins job openings surface/i,
  )
})
