import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T12:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Digitising Education | ICT Labs &amp; English Language Training</title>
    <link rel="canonical" href="https://www.schoolnetindia.com/more">
  </head>
  <body>
    <h1>Unlock Your Potential With Our Team Of Visionaries</h1>
    <a href="#job-openings">Browse Jobs</a>
    <section id="job-openings">
      <h2>Job Openings</h2>
      <article class="job-card">
        <h3>Senior Full Stack Developer</h3>
        <p>Remote / Noida</p>
        <p>Full-time</p>
        <p>Experience: 4+ years | Posted: 19-01-2025</p>
        <p>
          We are seeking an experienced Senior Full Stack Developer (MERN Stack) to design, develop,
          and maintain scalable, secure, and high-performance web and desktop applications.
        </p>
        <button>View Details</button>
        <button>Apply</button>
      </article>
      <article class="job-card">
        <h3>Trainer - Food Processing</h3>
        <p>As per requirement</p>
        <p>Contract/ Full-time</p>
        <p>Experience: 1 year | Posted: 19-03-2025</p>
        <p>
          We are seeking a qualified and experienced Food Processing Trainer to train students in
          Classes 9-12.
        </p>
        <button>View Details</button>
        <button>Apply</button>
      </article>
    </section>
  </body>
</html>
`

const hmsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>hms</title>
    <script type="module" crossorigin src="/assets/index-Q8Mjbwhh.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-BMbHyYvU.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/schoolnetindia/script.js')
  } catch {
    assert.fail('Expected Schoolnet India scraper module at ../../scraper/schoolnetindia/script.js')
  }
}

test('Schoolnet India helpers stay pinned to the verified official careers and HMS recruitment surfaces', async () => {
  const schoolnet = await loadModule()

  assert.equal(schoolnet.SOURCE, 'schoolnetindia')
  assert.equal(schoolnet.COMPANY_NAME, 'Schoolnet India')
  assert.equal(schoolnet.OFFICIAL_BRAND_NAME, 'Schoolnet India Ltd.')
  assert.equal(schoolnet.VERIFIED_ON, '2026-07-17')
  assert.equal(schoolnet.HOMEPAGE_URL, 'https://www.schoolnetindia.com/')
  assert.equal(schoolnet.CAREERS_URL, 'https://www.schoolnetindia.com/careers/')
  assert.equal(schoolnet.RECRUITMENT_PORTAL_URL, 'https://hms.schoolnetindia.com/login')
  assert.equal(schoolnet.hasOfficialCareersPageSignal(careersHtml), true)
  assert.equal(schoolnet.hasOfficialCareersPageSignal('<html><body>Job Openings</body></html>'), false)
  assert.equal(schoolnet.hasOfficialRecruitmentPortalSignal(hmsHtml), true)
  assert.equal(schoolnet.hasOfficialRecruitmentPortalSignal('<html><body>HMS</body></html>'), false)
  assert.deepEqual(
    schoolnet.extractRoleCardsFromCareersHtml(careersHtml).map((card) => card.text.split('\n')[0].trim()),
    [
      'Senior Full Stack Developer',
      'Trainer - Food Processing',
    ],
  )
  assert.equal(
    schoolnet.parseRoleCardText(`
      Senior Full Stack Developer
      Remote / Noida
      Full-time
      Experience: 4+ years | Posted: 19-01-2025
      We are seeking an experienced Senior Full Stack Developer (MERN Stack).
    `).title,
    'Senior Full Stack Developer',
  )
  assert.equal(
    schoolnet.parseRoleCardText(`
      Trainer - Food Processing
      As per requirement
      Contract/ Full-time
      Experience: 1 year | Posted: 19-03-2025
      We are seeking a qualified and experienced Food Processing Trainer.
    `).employmentType,
    'Contract/ Full-time',
  )
  assert.deepEqual(
    schoolnet.buildJobsFromRoleCards(
      [
        {
          text: `
            Senior Full Stack Developer
            Remote / Noida
            Full-time
            Experience: 4+ years | Posted: 19-01-2025
            We are seeking an experienced Senior Full Stack Developer (MERN Stack) to design,
            develop, and maintain scalable, secure, and high-performance web and desktop applications.
          `,
          detailUrl: 'https://www.schoolnetindia.com/careers/senior-full-stack-developer',
          applyUrl: 'https://www.schoolnetindia.com/careers/senior-full-stack-developer/apply',
        },
        {
          text: `
            Trainer - Food Processing
            As per requirement
            Contract/ Full-time
            Experience: 1 year | Posted: 19-03-2025
            We are seeking a qualified and experienced Food Processing Trainer to train students in
            Classes 9-12.
          `,
          detailUrl: 'https://www.schoolnetindia.com/careers/trainer-food-processing',
          applyUrl: 'https://www.schoolnetindia.com/careers/trainer-food-processing/apply',
        },
      ],
      { scrapedAt: FIXED_SCRAPED_AT },
    ),
    [
      {
        title: 'Senior Full Stack Developer',
        company: 'Schoolnet India',
        department: null,
        location: 'Remote / Noida, India',
        city: 'Noida',
        state: null,
        country: 'India',
        jobId: 'senior-full-stack-developer',
        requisitionId: 'senior-full-stack-developer',
        sourceUrl: 'https://www.schoolnetindia.com/careers/senior-full-stack-developer',
        applyUrl: 'https://www.schoolnetindia.com/careers/senior-full-stack-developer/apply',
        employmentType: 'Full-time',
        experienceRequired: '4+ years',
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: '2025-01-19',
        closingDate: null,
        jobDescription:
          'We are seeking an experienced Senior Full Stack Developer (MERN Stack) to design, develop, and maintain scalable, secure, and high-performance web and desktop applications.',
        remoteStatus: 'Remote',
        source: 'schoolnetindia',
        link: 'https://www.schoolnetindia.com/careers/senior-full-stack-developer',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        title: 'Trainer - Food Processing',
        company: 'Schoolnet India',
        department: null,
        location: 'As per requirement, India',
        city: null,
        state: null,
        country: 'India',
        jobId: 'trainer-food-processing',
        requisitionId: 'trainer-food-processing',
        sourceUrl: 'https://www.schoolnetindia.com/careers/trainer-food-processing',
        applyUrl: 'https://www.schoolnetindia.com/careers/trainer-food-processing/apply',
        employmentType: 'Contract/ Full-time',
        experienceRequired: '1 year',
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: '2025-03-19',
        closingDate: null,
        jobDescription:
          'We are seeking a qualified and experienced Food Processing Trainer to train students in Classes 9-12.',
        remoteStatus: 'On-site',
        source: 'schoolnetindia',
        link: 'https://www.schoolnetindia.com/careers/trainer-food-processing',
        scrapedAt: FIXED_SCRAPED_AT,
      },
    ],
  )
  assert.deepEqual(
    schoolnet.buildJobsFromRoleCards(
      schoolnet.extractRoleCardsFromCareersHtml(careersHtml),
      { scrapedAt: FIXED_SCRAPED_AT },
    ).map((job) => [job.title, job.jobId]),
    [
      ['Senior Full Stack Developer', 'senior-full-stack-developer'],
      ['Trainer - Food Processing', 'trainer-food-processing'],
    ],
  )
})

test('Schoolnet India run validates the official surfaces, extracts role cards, and decorates runner metadata', async () => {
  const schoolnet = await loadModule()
  const requestedUrls = []

  const jobs = await schoolnet.createSchoolnetIndiaScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === schoolnet.CAREERS_URL) return careersHtml
      if (url === schoolnet.RECRUITMENT_PORTAL_URL) return hmsHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
    loadRoleCards: async () => [
      {
        text: `
          Senior Full Stack Developer
          Remote / Noida
          Full-time
          Experience: 4+ years | Posted: 19-01-2025
          We are seeking an experienced Senior Full Stack Developer (MERN Stack) to design,
          develop, and maintain scalable, secure, and high-performance web and desktop applications.
        `,
        detailUrl: 'https://www.schoolnetindia.com/careers/senior-full-stack-developer',
        applyUrl: 'https://www.schoolnetindia.com/careers/senior-full-stack-developer/apply',
      },
      {
        text: `
          Trainer - Food Processing
          As per requirement
          Contract/ Full-time
          Experience: 1 year | Posted: 19-03-2025
          We are seeking a qualified and experienced Food Processing Trainer to train students in
          Classes 9-12.
        `,
        detailUrl: 'https://www.schoolnetindia.com/careers/trainer-food-processing',
        applyUrl: 'https://www.schoolnetindia.com/careers/trainer-food-processing/apply',
      },
    ],
  })

  assert.deepEqual(requestedUrls, [
    schoolnet.CAREERS_URL,
    schoolnet.RECRUITMENT_PORTAL_URL,
  ])
  assert.deepEqual(
    jobs.map((job) => [job.title, job.city, job.remoteStatus, job.source, job.link, job.scrapedAt]),
    [
      [
        'Senior Full Stack Developer',
        'Noida',
        'Remote',
        'schoolnetindia',
        'https://www.schoolnetindia.com/careers/senior-full-stack-developer',
        FIXED_SCRAPED_AT,
      ],
      [
        'Trainer - Food Processing',
        null,
        'On-site',
        'schoolnetindia',
        'https://www.schoolnetindia.com/careers/trainer-food-processing',
        FIXED_SCRAPED_AT,
      ],
    ],
  )
  assert.equal(jobs.length, 2)
})

test('Schoolnet India fails closed when the verified public surface drifts materially', async () => {
  const schoolnet = await loadModule()

  await assert.rejects(
    schoolnet.createSchoolnetIndiaScraper().run({
      fetchText: async (url) => {
        if (url === schoolnet.CAREERS_URL) return '<html><body>Job Openings</body></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
      loadRoleCards: async () => [],
    }),
    /official Schoolnet India careers page/i,
  )

  await assert.rejects(
    schoolnet.createSchoolnetIndiaScraper().run({
      fetchText: async (url) => {
        if (url === schoolnet.CAREERS_URL) return careersHtml
        if (url === schoolnet.RECRUITMENT_PORTAL_URL) return '<html><body>HMS</body></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
      loadRoleCards: async () => [],
    }),
    /official Schoolnet India recruitment portal/i,
  )

  await assert.rejects(
    schoolnet.createSchoolnetIndiaScraper().run({
      fetchText: async (url) => {
        if (url === schoolnet.CAREERS_URL) return careersHtml
        if (url === schoolnet.RECRUITMENT_PORTAL_URL) return hmsHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
      loadRoleCards: async () => [],
    }),
    /public role cards/i,
  )
})
