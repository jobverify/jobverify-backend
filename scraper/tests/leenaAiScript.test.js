import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-16T00:00:00.000Z'

const officialCareersHtml = `
  <html>
    <head>
      <link rel="canonical" href="https://leena.ai/careers">
      <title>Careers at Leena AI | Join Our Team in Agentic AI Innovation</title>
      <meta
        name="description"
        content="Explore careers at Leena AI, a leader in enterprise Agentic AI. Join our team to innovate in AI automation, work with top talent, and build the future of work. Check current openings and grow your career with us."
      >
    </head>
    <body>
      <h1>Join our team where people power AI</h1>
      <button>See open roles</button>
      <div>Explore jobs</div>
      <div id="open-roles-section">OPEN ROLES</div>
    </body>
  </html>
`

const careersBundleUrl = 'https://leena.ai/_next/static/chunks/pages/careers-dc4b1af244aa93dd.js'

const officialCareersHtmlWithBundle = officialCareersHtml.replace(
  '</body>',
  '  <script defer="" src="/_next/static/chunks/pages/careers-dc4b1af244aa93dd.js"></script>\n    </body>',
)

const careersBundleJs = `
  var nQ=[
    {id:1,title:"Technical Program Manager",location:"Gurgaon, India",locationKey:"Gurgaon India",department:"Engineering",link:"https://jobs.pyjamahr.com/leena-ai/technical-program-manager?source=JOB_LINK&shared_at=1780988641680",isHighlighted:!1},
    {id:2,title:"Account Executive",location:"New York, United States",locationKey:"USA",department:"Business Development",link:"https://jobs.pyjamahr.com/leena-ai/account-executive?source=JOB_LINK&shared_at=1780988670186",isHighlighted:!1},
    {id:3,title:"AI Engineer",location:"Gurgaon, India",locationKey:"Gurgaon India",department:"Engineering",link:"https://jobs.pyjamahr.com/leena-ai/ai-engineer?source=JOB_LINK&shared_at=1783485938705",isHighlighted:!1}
  ],n0=e=>null;
`

const openRoleCards = [
  {
    title: 'Technical Program Manager',
    location: 'Gurgaon, India',
  },
  {
    title: 'Sales Development Representative (SDR) - North America',
    location: 'Bangalore, India',
  },
  {
    title: 'Account Executive',
    location: 'New York, United States',
  },
]

const loadLeenaAiModule = async () => {
  try {
    return await import('../leenaai/script.js')
  } catch {
    assert.fail('Expected Leena AI scraper module at ../leenaai/script.js')
  }
}

test('Leena AI scraper keeps the verified first-party Explore Jobs surface explicit and fails closed on drift', async () => {
  const leenaAi = await loadLeenaAiModule()

  assert.equal(leenaAi.SOURCE, 'leenaai')
  assert.equal(leenaAi.COMPANY_NAME, 'Leena AI')
  assert.equal(leenaAi.HOMEPAGE_URL, 'https://leena.ai/')
  assert.equal(leenaAi.CAREERS_URL, 'https://leena.ai/careers')
  assert.equal(leenaAi.OPEN_ROLES_TAB_URL, 'https://leena.ai/careers?tab=explore-jobs')
  assert.equal(leenaAi.OPEN_ROLES_SECTION_ID, 'open-roles-section')
  assert.equal(leenaAi.VERIFIED_ON, '2026-07-19')
  assert.equal(leenaAi.hasOfficialLeenaAiCareersSignals(officialCareersHtml), true)
  assert.equal(
    leenaAi.hasOfficialLeenaAiCareersSignals(
      officialCareersHtml.replace('See open roles', 'Browse careers'),
    ),
    false,
  )

  const scraper = leenaAi.createLeenaAiScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async () => officialCareersHtml.replace('See open roles', 'Browse careers'),
      loadOpenRoles: async () => openRoleCards,
    }),
    /verified official careers page no longer matches the verified public surface/i,
  )
})

test('run maps verified Leena AI role cards into Jobify jobs and keeps only India roles', async () => {
  const { createLeenaAiScraper } = await loadLeenaAiModule()
  const scraper = createLeenaAiScraper({
    now: () => FIXED_SCRAPED_AT,
  })
  const requestedUrls = []

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return officialCareersHtml
    },
    loadOpenRoles: async () => openRoleCards,
  })

  assert.deepEqual(requestedUrls, ['https://leena.ai/careers'])
  assert.deepEqual(jobs, [
    {
      title: 'Technical Program Manager',
      company: 'Leena AI',
      department: null,
      location: 'Gurgaon, India',
      city: 'Gurgaon',
      country: 'India',
      jobId: 'technical-program-manager-gurgaon-india',
      requisitionId: 'technical-program-manager-gurgaon-india',
      sourceUrl: 'https://leena.ai/careers?tab=explore-jobs',
      applyUrl: 'https://leena.ai/careers?tab=explore-jobs',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
      source: 'leenaai',
      link: 'https://leena.ai/careers?tab=explore-jobs',
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Sales Development Representative (SDR) - North America',
      company: 'Leena AI',
      department: null,
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      jobId: 'sales-development-representative-sdr-north-america-bangalore-india',
      requisitionId: 'sales-development-representative-sdr-north-america-bangalore-india',
      sourceUrl: 'https://leena.ai/careers?tab=explore-jobs',
      applyUrl: 'https://leena.ai/careers?tab=explore-jobs',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
      source: 'leenaai',
      link: 'https://leena.ai/careers?tab=explore-jobs',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('run maps Leena AI roles from the first-party careers bundle without browser rendering', async () => {
  const leenaAi = await loadLeenaAiModule()
  const scraper = leenaAi.createLeenaAiScraper({
    now: () => FIXED_SCRAPED_AT,
  })
  const requestedUrls = []

  assert.equal(leenaAi.extractOpenRolesBundleUrl(officialCareersHtmlWithBundle), careersBundleUrl)
  assert.deepEqual(
    leenaAi.extractOpenRolesFromCareersBundle(careersBundleJs),
    [
      {
        title: 'Technical Program Manager',
        location: 'Gurgaon, India',
        department: 'Engineering',
        link: 'https://jobs.pyjamahr.com/leena-ai/technical-program-manager?source=JOB_LINK&shared_at=1780988641680',
      },
      {
        title: 'Account Executive',
        location: 'New York, United States',
        department: 'Business Development',
        link: 'https://jobs.pyjamahr.com/leena-ai/account-executive?source=JOB_LINK&shared_at=1780988670186',
      },
      {
        title: 'AI Engineer',
        location: 'Gurgaon, India',
        department: 'Engineering',
        link: 'https://jobs.pyjamahr.com/leena-ai/ai-engineer?source=JOB_LINK&shared_at=1783485938705',
      },
    ],
  )

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === leenaAi.CAREERS_URL) return officialCareersHtmlWithBundle
      if (url === careersBundleUrl) return careersBundleJs
      throw new Error(`Unexpected Leena AI fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [leenaAi.CAREERS_URL, careersBundleUrl])
  assert.deepEqual(
    jobs.map((job) => [job.title, job.department, job.sourceUrl]),
    [
      [
        'Technical Program Manager',
        'Engineering',
        'https://jobs.pyjamahr.com/leena-ai/technical-program-manager?source=JOB_LINK&shared_at=1780988641680',
      ],
      [
        'AI Engineer',
        'Engineering',
        'https://jobs.pyjamahr.com/leena-ai/ai-engineer?source=JOB_LINK&shared_at=1783485938705',
      ],
    ],
  )
})

test('Leena AI browser loader extracts visible role cards from the open roles section', async () => {
  const leenaAi = await loadLeenaAiModule()
  const interactions = []
  const fakePage = {
    goto: async (url, options) => {
      interactions.push(['goto', url, options.waitUntil])
      return { ok: () => true, status: () => 200 }
    },
    waitForSelector: async (selector) => {
      interactions.push(['waitForSelector', selector])
    },
    click: async () => {
      assert.fail('Leena AI browser loader should not click role cards before extraction')
    },
    evaluate: async () => [
      { title: 'Technical Program Manager', location: 'Gurgaon, India' },
      { title: 'AI Engineer', location: 'Gurgaon, India' },
    ],
  }

  const loader = leenaAi.createBrowserOpenRolesLoader({
    launchBrowserImpl: async () => ({
      close: async () => {
        interactions.push(['close'])
      },
    }),
    createOptimizedPageImpl: async () => fakePage,
  })

  const cards = await loader.load()

  assert.deepEqual(cards, [
    { title: 'Technical Program Manager', location: 'Gurgaon, India' },
    { title: 'AI Engineer', location: 'Gurgaon, India' },
  ])
  assert.deepEqual(interactions, [
    ['goto', 'https://leena.ai/careers?tab=explore-jobs', 'networkidle2'],
    ['waitForSelector', '#open-roles-section'],
    ['close'],
  ])
})
