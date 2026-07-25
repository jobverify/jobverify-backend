import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'
const PROGRAM_MANAGER_URL = 'https://www.stellapps.com/jobopenings/program-manager/'
const SERVICE_ENGINEER_URL = 'https://www.stellapps.com/jobopenings/service-engineer/'

const JOB_OPENINGS_ARCHIVE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Openings - Stellapps</title>
  </head>
  <body>
    <section class="career-hero">
      <h1>Archives: Job Openings</h1>
      <p>Job Openings</p>
    </section>
    <article class="post">
      <h2 class="entry-title">
        <a href="${PROGRAM_MANAGER_URL}">Program Manager</a>
      </h2>
    </article>
    <article class="post">
      <h2 class="entry-title">
        <a href="${SERVICE_ENGINEER_URL}">Service Engineer</a>
      </h2>
    </article>
    <nav class="navigation posts-navigation">
      <div class="nav-links">
        <a class="next page-numbers" href="https://www.stellapps.com/jobopenings/page/2/">Older posts</a>
      </div>
    </nav>
    <footer>
      <h4>About Stellapps</h4>
      <a href="https://www.stellapps.com/career/">Careers</a>
    </footer>
  </body>
</html>
`

const PROGRAM_MANAGER_DETAIL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Program Manager - Stellapps</title>
  </head>
  <body>
    <article class="job-opening">
      <h4>Part time</h4>
      <h3>3+ Years</h3>
      <h3>Bangalore</h3>
      <a href="#apply">APPLY</a>
      <h2>Program Manager</h2>
      <p>Test-2</p>
      <h4>About Stellapps</h4>
    </article>
  </body>
</html>
`

const SERVICE_ENGINEER_DETAIL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Service Engineer - Stellapps</title>
  </head>
  <body>
    <article class="job-opening">
      <h4>Full Time</h4>
      <h3>2-3 years</h3>
      <h3>Palamaner</h3>
      <a href="#apply">APPLY</a>
      <h2>Service Engineer</h2>
      <p>2+years of experience in PCB Analyzing and repair and Hands-on experience in soldering & de-soldering of all types of components</p>
      <h2>Qualification</h2>
      <h3>Diploma E&amp;C or B.E E&amp;C</h3>
      <h2>Job Description</h2>
      <ul>
        <li>PCB Analyzing and repair.</li>
        <li>Hands-on experience in soldering &amp; de-soldering of all types of components.</li>
        <li>Able to understand electronic schematic &amp; data sheets.</li>
        <li>Analyzing the cause of failure and repairing the faulty parts.</li>
        <li>Testing and troubleshooting electronic circuits.</li>
        <li>Testing and troubleshooting of rectifiers, amplifiers &amp; sensors.</li>
        <li>Familiar with basic test equipments like CRO, function generators, DVM &amp; tools.</li>
        <li>Knowldge in ADC, UART, Wifi, Bluetooth, GSM AT commands and Zigbee.</li>
        <li>Porting/flashing of software, Basic knowldge in programing and linux commands</li>
        <li>Good communication skill.</li>
        <li>Travel 40-50%</li>
      </ul>
      <h2>Knowledge</h2>
      <ul>
        <li>Indepth knowldge in electronic components</li>
        <li>Linux OS</li>
        <li>C Programming</li>
        <li>MS Office / Libro Office</li>
      </ul>
      <h2>Roles and Responsibilities</h2>
      <ul>
        <li>The candidate’s primary responsibility will be servicing the faulty materials within SLA.</li>
        <li>Service Report preparation.</li>
        <li>Daily status Report and Monthly service reports preparation.</li>
        <li>Repeated failure analysis report preparation.</li>
        <li>The candidate shall be ready to travel on a requirement basis.</li>
        <li>The responsibility will also be considered not to share or disclose any of the confidential data such as circuit diagrams, software etc.</li>
        <li>The candidate shall be responsible for the entire service equipment and tools.</li>
      </ul>
      <h4>About Stellapps</h4>
    </article>
  </body>
</html>
`

const SERVICE_ENGINEER_DESCRIPTION = '2+years of experience in PCB Analyzing and repair and Hands-on experience in soldering & de-soldering of all types of components Qualification: Diploma E&C or B.E E&C Job Description: PCB Analyzing and repair. Hands-on experience in soldering & de-soldering of all types of components. Able to understand electronic schematic & data sheets. Analyzing the cause of failure and repairing the faulty parts. Testing and troubleshooting electronic circuits. Testing and troubleshooting of rectifiers, amplifiers & sensors. Familiar with basic test equipments like CRO, function generators, DVM & tools. Knowldge in ADC, UART, Wifi, Bluetooth, GSM AT commands and Zigbee. Porting/flashing of software, Basic knowldge in programing and linux commands Good communication skill. Travel 40-50% Knowledge: Indepth knowldge in electronic components Linux OS C Programming MS Office / Libro Office Roles and Responsibilities: The candidate’s primary responsibility will be servicing the faulty materials within SLA. Service Report preparation. Daily status Report and Monthly service reports preparation. Repeated failure analysis report preparation. The candidate shall be ready to travel on a requirement basis. The responsibility will also be considered not to share or disclose any of the confidential data such as circuit diagrams, software etc. The candidate shall be responsible for the entire service equipment and tools.'

const loadModule = async () => {
  try {
    return await import('../stellapps/script.js')
  } catch {
    assert.fail('Expected Stellapps scraper module at ../stellapps/script.js')
  }
}

test('Stellapps helpers stay pinned to the verified archive and first-party detail page structure', async () => {
  const stellapps = await loadModule()

  assert.equal(stellapps.SOURCE, 'stellapps')
  assert.equal(stellapps.COMPANY_NAME, 'Stellapps')
  assert.equal(stellapps.OFFICIAL_BRAND_NAME, 'Stellapps')
  assert.equal(stellapps.VERIFIED_ON, '2026-07-17')
  assert.equal(stellapps.CAREERS_LANDING_URL, 'https://www.stellapps.com/career/')
  assert.equal(stellapps.JOB_OPENINGS_URL, 'https://www.stellapps.com/jobopenings/')
  assert.equal(stellapps.hasOfficialJobOpeningsSignal(JOB_OPENINGS_ARCHIVE_HTML), true)
  assert.equal(stellapps.hasOfficialJobOpeningsSignal('<html><body><h1>Jobs</h1></body></html>'), false)

  assert.deepEqual(stellapps.extractListingCards(JOB_OPENINGS_ARCHIVE_HTML), [
    {
      title: 'Program Manager',
      detailUrl: PROGRAM_MANAGER_URL,
    },
    {
      title: 'Service Engineer',
      detailUrl: SERVICE_ENGINEER_URL,
    },
  ])

  assert.deepEqual(stellapps.extractJobDetail(PROGRAM_MANAGER_DETAIL_HTML, PROGRAM_MANAGER_URL), {
    title: 'Program Manager',
    location: 'Bangalore, India',
    city: 'Bangalore',
    employmentType: 'Part time',
    experienceRequired: '3+ Years',
    minimumQualification: null,
    jobDescription: 'Test-2',
    jobId: 'stellapps-program-manager',
    remoteStatus: 'On-site',
    detailUrl: PROGRAM_MANAGER_URL,
  })

  assert.deepEqual(stellapps.extractJobDetail(SERVICE_ENGINEER_DETAIL_HTML, SERVICE_ENGINEER_URL), {
    title: 'Service Engineer',
    location: 'Palamaner, India',
    city: 'Palamaner',
    employmentType: 'Full Time',
    experienceRequired: '2-3 Years',
    minimumQualification: 'Diploma E&C or B.E E&C',
    jobDescription: SERVICE_ENGINEER_DESCRIPTION,
    jobId: 'stellapps-service-engineer',
    remoteStatus: 'On-site',
    detailUrl: SERVICE_ENGINEER_URL,
  })
})

test('Stellapps run validates the verified archive and maps first-party detail pages into normalized jobs', async () => {
  const stellapps = await loadModule()
  const requestedUrls = []

  const jobs = await stellapps.createStellappsScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === stellapps.JOB_OPENINGS_URL) return JOB_OPENINGS_ARCHIVE_HTML
      if (url === PROGRAM_MANAGER_URL) return PROGRAM_MANAGER_DETAIL_HTML
      if (url === SERVICE_ENGINEER_URL) return SERVICE_ENGINEER_DETAIL_HTML
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    stellapps.JOB_OPENINGS_URL,
    PROGRAM_MANAGER_URL,
    SERVICE_ENGINEER_URL,
  ])
  assert.deepEqual(jobs, [
    {
      title: 'Program Manager',
      company: 'Stellapps',
      department: null,
      location: 'Bangalore, India',
      city: 'Bangalore',
      state: null,
      country: 'India',
      jobId: 'stellapps-program-manager',
      requisitionId: null,
      sourceUrl: PROGRAM_MANAGER_URL,
      applyUrl: PROGRAM_MANAGER_URL,
      employmentType: 'Part time',
      experienceRequired: '3+ Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Test-2',
      remoteStatus: 'On-site',
      source: 'stellapps',
      link: PROGRAM_MANAGER_URL,
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Service Engineer',
      company: 'Stellapps',
      department: null,
      location: 'Palamaner, India',
      city: 'Palamaner',
      state: null,
      country: 'India',
      jobId: 'stellapps-service-engineer',
      requisitionId: null,
      sourceUrl: SERVICE_ENGINEER_URL,
      applyUrl: SERVICE_ENGINEER_URL,
      employmentType: 'Full Time',
      experienceRequired: '2-3 Years',
      minimumQualification: 'Diploma E&C or B.E E&C',
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: SERVICE_ENGINEER_DESCRIPTION,
      remoteStatus: 'On-site',
      source: 'stellapps',
      link: SERVICE_ENGINEER_URL,
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Stellapps fails closed when the verified archive or detail page contract drifts', async () => {
  const stellapps = await loadModule()

  await assert.rejects(
    stellapps.createStellappsScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /verified job openings archive/i,
  )

  await assert.rejects(
    stellapps.createStellappsScraper().run({
      fetchText: async () => JOB_OPENINGS_ARCHIVE_HTML.replace(
        /<article class="post">[\s\S]*?<\/article>\s*<article class="post">[\s\S]*?<\/article>/,
        '',
      ),
    }),
    /no public job detail links/i,
  )

  await assert.rejects(
    stellapps.createStellappsScraper().run({
      fetchText: async (url) => {
        if (url === stellapps.JOB_OPENINGS_URL) return JOB_OPENINGS_ARCHIVE_HTML
        if (url === PROGRAM_MANAGER_URL) return PROGRAM_MANAGER_DETAIL_HTML
        if (url === SERVICE_ENGINEER_URL) return '<html><body><h2>Service Engineer</h2></body></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified first-party job detail page/i,
  )
})
