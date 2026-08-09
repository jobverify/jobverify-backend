import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../../scraper/gadgeon/script.js')
  } catch {
    return null
  }
}

const listingPageData = {
  url: 'https://www.gadgeon.com/joinus/',
  title: 'Join us - Gadgeon',
  text: `
    Join us
    Current Openings
    Senior Software Engineer
    Kochi, India
    5-8 Years
    Embedded Systems
    Apply Now
    QA Automation Engineer
    Bangalore, India
    3-5 Years
    Quality Engineering
    Apply Now
    Senior Account Manager
    Dubai, United Arab Emirates
    8-10 Years
    Sales
    Apply Now
    careers@gadgeon.com
  `,
  jobs: [
    {
      title: 'Senior Software Engineer',
      location: 'Kochi, India',
      experienceRequired: '5-8 Years',
      department: 'Embedded Systems',
    },
    {
      title: 'QA Automation Engineer',
      location: 'Bangalore, India',
      experienceRequired: '3-5 Years',
      department: 'Quality Engineering',
    },
    {
      title: 'Senior Account Manager',
      location: 'Dubai, United Arab Emirates',
      experienceRequired: '8-10 Years',
      department: 'Sales',
    },
  ],
  links: [
    {
      text: 'Apply Now',
      href: 'mailto:careers@gadgeon.com',
    },
  ],
}

test('Gadgeon scraper validates the verified public careers page and extracts India jobs from rendered page data', async () => {
  const gadgeon = await loadModule()
  assert.ok(gadgeon, 'Gadgeon scraper module should load')

  const {
    CAREERS_PAGE_URL,
    COMPANY,
    SOURCE,
    VERIFIED_PAGE_SIGNAL,
    extractJobsFromPageData,
    hasVerifiedCareersSurface,
  } = gadgeon

  assert.equal(SOURCE, 'gadgeon')
  assert.equal(COMPANY, 'Gadgeon')
  assert.equal(CAREERS_PAGE_URL, 'https://www.gadgeon.com/joinus/')
  assert.equal(VERIFIED_PAGE_SIGNAL, 'Current Openings')
  assert.equal(hasVerifiedCareersSurface(listingPageData), true)
  assert.deepEqual(extractJobsFromPageData(listingPageData), [
    {
      title: 'Senior Software Engineer',
      company: 'Gadgeon',
      department: 'Embedded Systems',
      location: 'Kochi, India',
      city: 'Kochi',
      country: 'India',
      jobId: 'senior-software-engineer-kochi-india',
      requisitionId: 'senior-software-engineer-kochi-india',
      sourceUrl: 'https://www.gadgeon.com/joinus/',
      applyUrl: 'https://www.gadgeon.com/joinus/',
      employmentType: null,
      experienceRequired: '5-8 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    },
    {
      title: 'QA Automation Engineer',
      company: 'Gadgeon',
      department: 'Quality Engineering',
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      jobId: 'qa-automation-engineer-bangalore-india',
      requisitionId: 'qa-automation-engineer-bangalore-india',
      sourceUrl: 'https://www.gadgeon.com/joinus/',
      applyUrl: 'https://www.gadgeon.com/joinus/',
      employmentType: null,
      experienceRequired: '3-5 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    },
  ])
})

test('Gadgeon scraper runs through the browser-backed page collector and decorates final jobs', async () => {
  const gadgeon = await loadModule()
  assert.ok(gadgeon, 'Gadgeon scraper module should load')

  const { CAREERS_PAGE_URL, createGadgeonScraper } = gadgeon
  const requestedUrls = []

  const jobs = await createGadgeonScraper({ maxJobs: 1 }).run({
    collectPageDataImpl: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, CAREERS_PAGE_URL)
      return listingPageData
    },
  })

  assert.deepEqual(requestedUrls, [CAREERS_PAGE_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Senior Software Engineer')
  assert.equal(jobs[0].source, 'gadgeon')
  assert.equal(jobs[0].link, jobs[0].sourceUrl)
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('Gadgeon scraper rejects careers pages that no longer match the verified public surface', async () => {
  const gadgeon = await loadModule()
  assert.ok(gadgeon, 'Gadgeon scraper module should load')

  await assert.rejects(
    gadgeon.createGadgeonScraper().run({
      collectPageDataImpl: async () => ({
        title: 'Careers',
        text: 'Open roles',
        jobs: [],
        links: [],
      }),
    }),
    /verified public careers surface/i,
  )
})
