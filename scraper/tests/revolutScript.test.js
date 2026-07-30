import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T12:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Revolut India</title>
    <meta name="description" content="Join the people creating a one-stop shop for financial freedom">
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <p>We have 610 open positions</p>
      <p>Join the people creating a one-stop shop for financial freedom</p>
    </main>
  </body>
</html>
`

const positions = [
  {
    id: '666ce819-a63a-4642-98c8-66c88af9c63a',
    text: 'Business Development Manager (Financial Partnerships)',
    locations: [
      { name: 'Bangalore', type: 'office', country: 'India' },
      { name: 'India - Remote', type: 'remote', country: 'India' },
      { name: 'London', type: 'office', country: 'United Kingdom' },
    ],
    description: '',
    team: 'Sales',
    video: null,
    is_featured: false,
  },
  {
    id: '17e17dcf-db18-4065-9a9f-50b2bc4f8a71',
    text: 'Software Engineer (DevOps)',
    locations: [
      { name: 'India - Remote', type: 'remote', country: 'India' },
    ],
    description: 'Build reliable infrastructure for the platform.',
    team: 'Engineering',
    video: null,
    is_featured: false,
  },
  {
    id: 'ba99036f-306a-4d82-98bc-8ff73853d41c',
    text: 'Graphic Designer (Growth)',
    locations: [
      { name: 'Tokyo', type: 'office', country: 'Japan' },
      { name: 'Japan - Remote', type: 'remote', country: 'Japan' },
    ],
    description: '',
    team: 'Marketing & Comms',
    video: null,
    is_featured: false,
  },
]

const loadModule = async () => {
  try {
    return await import('../revolut/script.js')
  } catch {
    assert.fail('Expected Revolut scraper module at ../revolut/script.js')
  }
}

test('Revolut scraper stays pinned to the verified first-party careers page and detail URL contract', async () => {
  const revolut = await loadModule()

  assert.equal(revolut.SOURCE, 'revolut')
  assert.equal(revolut.COMPANY, 'Revolut')
  assert.equal(revolut.OFFICIAL_BRAND_NAME, 'Revolut')
  assert.equal(revolut.VERIFIED_ON, '2026-07-17')
  assert.equal(revolut.CAREERS_PAGE_URL, 'https://www.revolut.com/en-IN/careers/')
  assert.equal(revolut.POSITION_URL_LOCALE, 'en-US')
  assert.equal(
    revolut.buildPositionDetailUrl('666ce819-a63a-4642-98c8-66c88af9c63a'),
    'https://www.revolut.com/en-US/careers/position/666ce819-a63a-4642-98c8-66c88af9c63a/',
  )
  assert.equal(revolut.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(revolut.hasOfficialCareersSignal('<html><title>Careers</title></html>'), false)
})

test('Revolut extracts India jobs from the verified first-party Next.js payload and normalizes remote status', async () => {
  const revolut = await loadModule()

  assert.deepEqual(revolut.extractIndiaJobs(positions), [
    {
      title: 'Business Development Manager (Financial Partnerships)',
      company: 'Revolut',
      department: 'Sales',
      location: 'Bangalore, India - Remote',
      city: 'Bangalore',
      state: null,
      country: 'India',
      jobId: '666ce819-a63a-4642-98c8-66c88af9c63a',
      requisitionId: '666ce819-a63a-4642-98c8-66c88af9c63a',
      sourceUrl: 'https://www.revolut.com/en-US/careers/position/666ce819-a63a-4642-98c8-66c88af9c63a/',
      applyUrl: 'https://www.revolut.com/en-US/careers/position/666ce819-a63a-4642-98c8-66c88af9c63a/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'Hybrid',
    },
    {
      title: 'Software Engineer (DevOps)',
      company: 'Revolut',
      department: 'Engineering',
      location: 'India - Remote',
      city: null,
      state: null,
      country: 'India',
      jobId: '17e17dcf-db18-4065-9a9f-50b2bc4f8a71',
      requisitionId: '17e17dcf-db18-4065-9a9f-50b2bc4f8a71',
      sourceUrl: 'https://www.revolut.com/en-US/careers/position/17e17dcf-db18-4065-9a9f-50b2bc4f8a71/',
      applyUrl: 'https://www.revolut.com/en-US/careers/position/17e17dcf-db18-4065-9a9f-50b2bc4f8a71/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Build reliable infrastructure for the platform.',
      remoteStatus: 'Remote',
    },
  ])
})

test('Revolut run validates the official careers surface, reads the embedded positions payload, and decorates India jobs', async () => {
  const revolut = await loadModule()
  const events = []

  const fakePage = {
    goto: async (url, options) => {
      events.push(['goto', url, options.waitUntil])
    },
    content: async () => {
      events.push(['content'])
      return careersHtml
    },
    evaluate: async () => {
      events.push(['evaluate'])
      return positions
    },
  }

  const jobs = await revolut.createRevolutScraper({
    now: () => FIXED_SCRAPED_AT,
    maxJobs: 1,
  }).run({
    launchBrowser: async () => ({
      close: async () => {
        events.push(['close'])
      },
    }),
    createOptimizedPage: async () => fakePage,
  })

  assert.deepEqual(events, [
    ['goto', 'https://www.revolut.com/en-IN/careers/', 'networkidle2'],
    ['content'],
    ['evaluate'],
    ['close'],
  ])
  assert.deepEqual(jobs, [
    {
      title: 'Business Development Manager (Financial Partnerships)',
      company: 'Revolut',
      department: 'Sales',
      location: 'Bangalore, India - Remote',
      city: 'Bangalore',
      state: null,
      country: 'India',
      jobId: '666ce819-a63a-4642-98c8-66c88af9c63a',
      requisitionId: '666ce819-a63a-4642-98c8-66c88af9c63a',
      sourceUrl: 'https://www.revolut.com/en-US/careers/position/666ce819-a63a-4642-98c8-66c88af9c63a/',
      applyUrl: 'https://www.revolut.com/en-US/careers/position/666ce819-a63a-4642-98c8-66c88af9c63a/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'Hybrid',
      source: 'revolut',
      link: 'https://www.revolut.com/en-US/careers/position/666ce819-a63a-4642-98c8-66c88af9c63a/',
      scrapedAt: FIXED_SCRAPED_AT,
      companyCareerPage: 'https://www.revolut.com/en-IN/careers/',
      companyDomain: 'revolut.com',
      atsPlatform: 'official-first-party-nextjs-careers',
    },
  ])
})

test('Revolut fails closed when the careers page markers or embedded positions payload drift materially', async () => {
  const revolut = await loadModule()

  await assert.rejects(
    revolut.createRevolutScraper().run({
      launchBrowser: async () => ({
        close: async () => {},
      }),
      createOptimizedPage: async () => ({
        goto: async () => {},
        content: async () => '<html><head><title>Careers</title></head><body>Open roles</body></html>',
        evaluate: async () => positions,
      }),
    }),
    /official Revolut careers page/i,
  )

  await assert.rejects(
    revolut.createRevolutScraper().run({
      launchBrowser: async () => ({
        close: async () => {},
      }),
      createOptimizedPage: async () => ({
        goto: async () => {},
        content: async () => careersHtml,
        evaluate: async () => null,
      }),
    }),
    /positions payload/i,
  )
})
