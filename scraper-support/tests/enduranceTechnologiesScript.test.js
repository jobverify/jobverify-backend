import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-15T11:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Endurance</title>
  </head>
  <body>
    <nav>
      <a href="https://www.endurancegroup.com/careers/job-portal/">Job Portal</a>
    </nav>
    <main>
      <h1>Unleash your potential</h1>
      <p>I am interested in</p>
      <p>Life At Endurance</p>
      <p>Equal opportunities, equal dignity without discrimination</p>
    </main>
  </body>
</html>
`

const jobPortalHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Portal - Endurance</title>
  </head>
  <body>
    <main>
      <h2>Current Opening</h2>
      <p>Drop your CV here</p>
      <p>Current Opening (6)</p>
      <ul>
        <li class="job-card">
          <h3>Job Opening for Technical Architect</h3>
          <p>14 Years</p>
          <p>Assistant Manager</p>
          <p>Pune</p>
          <a href="https://www.endurancegroup.com/career/technical-architect/">Read More</a>
        </li>
        <li class="job-card">
          <h3>Job Opening for Technical Lead – Hardware</h3>
          <p>7 Years</p>
          <p>Assistant Manager</p>
          <p>Pune</p>
          <a href="https://www.endurancegroup.com/career/technical-lead-hardware/">Read More</a>
        </li>
        <li class="job-card">
          <h3>Job Opening for Technical Member – Hardware</h3>
          <p>4 Years</p>
          <p>Assistant Manager</p>
          <p>Pune</p>
          <a href="https://www.endurancegroup.com/career/technical-member-hardware/">Read More</a>
        </li>
        <li class="job-card">
          <h3>Job Opening for Technical Lead – Software</h3>
          <p>7 Years</p>
          <p>Assistant Manager</p>
          <p>Pune</p>
          <a href="https://www.endurancegroup.com/career/technical-lead-software/">Read More</a>
        </li>
        <li class="job-card">
          <h3>Job Opening for Technical Member – Software</h3>
          <p>4 Years</p>
          <p>Assistant Manager</p>
          <p>Pune</p>
          <a href="https://www.endurancegroup.com/career/technical-member-software/">Read More</a>
        </li>
        <li class="job-card">
          <h3>Job Opening for Technical Member (Verification &amp; Validation)</h3>
          <p>4 Years</p>
          <p>Assistant Manager</p>
          <p>Pune</p>
          <a href="https://www.endurancegroup.com/career/technical-member-verification-validation/">Read More</a>
        </li>
      </ul>
      <h3>Apply Now</h3>
    </main>
  </body>
</html>
`

const technicalArchitectDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Technical Architect - Endurance</title>
  </head>
  <body>
    <main>
      <h1>Technical Architect</h1>
      <div class="job-meta">
        <p>Assistant Manager</p>
        <p>14 Years</p>
        <p>Pune</p>
      </div>
      <a href="#apply">Apply now</a>
      <h2>Technical Architect</h2>
      <h3>Job Responsibilities</h3>
      <ul>
        <li>He/She will work as the Technical Leader for our Ongoing Embedded Projects.</li>
        <li>Candidate will be responsible for defining and governing overall system architecture for ECUs which Includes HW and SW.</li>
        <li>Additionally he/she will manage the team leaders from SW, HW and V&amp;V divisions.</li>
      </ul>
      <a href="#responsibilities">Read More</a>
      <h3>Job Qualifications</h3>
      <ul>
        <li>B.E/B.Tech (Electronics/Electrical/Computer Science)</li>
        <li>CDAC certification (VLSI or similar) will be considered as an added advantage</li>
      </ul>
      <a href="#qualifications">Read More</a>
    </main>
  </body>
</html>
`

const technicalLeadHardwareDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Technical Lead - Hardware - Endurance</title>
  </head>
  <body>
    <main>
      <h1>Technical Lead – Hardware</h1>
      <div class="job-meta">
        <p>Assistant Manager</p>
        <p>7 Years</p>
        <p>Pune</p>
      </div>
      <a href="#apply">Apply now</a>
      <h2>Technical Lead – Hardware</h2>
      <h3>Job Responsibilities</h3>
      <ul>
        <li>He/She will work as the Hardware Lead for our Ongoing Embedded Project.</li>
        <li>Candidate will be responsible to Design &amp; Develop end to end electronic Circuits, create Prototypes and sample hardware and taking it till production.</li>
        <li>Additionally he/she will be leading a hardware team.</li>
      </ul>
      <a href="#responsibilities">Read More</a>
      <h3>Job Qualifications</h3>
      <ul>
        <li>B.E/B.Tech (Electronics/Electrical/Computer Science)</li>
        <li>CDAC certification (VLSI or similar) will be considered as an added advantage</li>
      </ul>
      <a href="#qualifications">Read More</a>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/endurancetechnologies/script.js')
  } catch {
    assert.fail('Expected Endurance Technologies scraper module at ../../scraper/endurancetechnologies/script.js')
  }
}

test('Endurance Technologies helpers keep the verified first-party careers, job portal, and detail contracts explicit', async () => {
  const enduranceTechnologies = await loadModule()

  assert.equal(enduranceTechnologies.COMPANY, 'Endurance Technologies')
  assert.equal(enduranceTechnologies.OFFICIAL_BRAND_NAME, 'Endurance Technologies Limited')
  assert.equal(enduranceTechnologies.SOURCE, 'endurancetechnologies')
  assert.equal(enduranceTechnologies.HOMEPAGE_URL, 'https://www.endurancegroup.com/')
  assert.equal(enduranceTechnologies.CAREERS_URL, 'https://www.endurancegroup.com/careers/')
  assert.equal(enduranceTechnologies.JOB_PORTAL_URL, 'https://www.endurancegroup.com/careers/job-portal/')
  assert.deepEqual(enduranceTechnologies.VERIFIED_JOB_URLS, [
    'https://www.endurancegroup.com/career/technical-architect/',
    'https://www.endurancegroup.com/career/technical-lead-hardware/',
    'https://www.endurancegroup.com/career/technical-member-hardware/',
    'https://www.endurancegroup.com/career/technical-lead-software/',
    'https://www.endurancegroup.com/career/technical-member-software/',
    'https://www.endurancegroup.com/career/technical-member-verification-validation/',
  ])
  assert.equal(enduranceTechnologies.VERIFIED_ON, '2026-07-15')
  assert.match(enduranceTechnologies.VERIFIED_SURFACE_SUMMARY, /\b403\b/i)
  assert.match(enduranceTechnologies.VERIFIED_SURFACE_SUMMARY, /Just a moment/i)
  assert.equal(enduranceTechnologies.hasOfficialCareersPageSignal(careersHtml), true)
  assert.equal(
    enduranceTechnologies.extractJobPortalUrl(careersHtml),
    enduranceTechnologies.JOB_PORTAL_URL,
  )
  assert.equal(enduranceTechnologies.hasOfficialJobPortalSignal(jobPortalHtml), true)
  assert.deepEqual(
    await enduranceTechnologies.collectListingCandidates({
      evaluate: async () => ([
        {
          title: 'Job Opening for Technical Architect',
          experience: '14 Years',
          designation: 'Assistant Manager',
          location: 'Pune',
          sourceUrl: 'https://www.endurancegroup.com/career/technical-architect/',
        },
        {
          title: 'Job Opening for Technical Lead – Hardware',
          experience: '7 Years',
          designation: 'Assistant Manager',
          location: 'Pune',
          sourceUrl: 'https://www.endurancegroup.com/career/technical-lead-hardware/',
        },
      ]),
    }),
    [
      {
        title: 'Job Opening for Technical Architect',
        experience: '14 Years',
        designation: 'Assistant Manager',
        location: 'Pune',
        sourceUrl: 'https://www.endurancegroup.com/career/technical-architect/',
      },
      {
        title: 'Job Opening for Technical Lead – Hardware',
        experience: '7 Years',
        designation: 'Assistant Manager',
        location: 'Pune',
        sourceUrl: 'https://www.endurancegroup.com/career/technical-lead-hardware/',
      },
    ],
  )

  assert.deepEqual(
    enduranceTechnologies.normalizeListingCandidate({
      title: 'Job Opening for Technical Architect',
      experience: '14 Years',
      designation: 'Assistant Manager',
      location: 'Pune',
      sourceUrl: 'https://www.endurancegroup.com/career/technical-architect/',
    }),
    {
      title: 'Technical Architect',
      company: 'Endurance Technologies',
      designation: 'Assistant Manager',
      experienceRequired: '14 Years',
      location: 'Pune, Maharashtra, India',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      jobId: 'endurancetechnologies-technical-architect',
      requisitionId: 'endurancetechnologies-technical-architect',
      sourceUrl: 'https://www.endurancegroup.com/career/technical-architect/',
      applyUrl: 'https://www.endurancegroup.com/career/technical-architect/',
      department: null,
      employmentType: null,
      jobDescription: null,
    },
  )

  assert.equal(
    enduranceTechnologies.hasOfficialJobDetailSignal(
      technicalArchitectDetailHtml,
      enduranceTechnologies.normalizeListingCandidate({
        title: 'Job Opening for Technical Architect',
        experience: '14 Years',
        designation: 'Assistant Manager',
        location: 'Pune',
        sourceUrl: 'https://www.endurancegroup.com/career/technical-architect/',
      }),
    ),
    true,
  )

  assert.deepEqual(
    enduranceTechnologies.extractJobDetail(
      technicalArchitectDetailHtml,
      enduranceTechnologies.normalizeListingCandidate({
        title: 'Job Opening for Technical Architect',
        experience: '14 Years',
        designation: 'Assistant Manager',
        location: 'Pune',
        sourceUrl: 'https://www.endurancegroup.com/career/technical-architect/',
      }),
    ),
    {
      title: 'Technical Architect',
      company: 'Endurance Technologies',
      designation: 'Assistant Manager',
      department: null,
      location: 'Pune, Maharashtra, India',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      jobId: 'endurancetechnologies-technical-architect',
      requisitionId: 'endurancetechnologies-technical-architect',
      sourceUrl: 'https://www.endurancegroup.com/career/technical-architect/',
      applyUrl: 'https://www.endurancegroup.com/career/technical-architect/',
      employmentType: null,
      experienceRequired: '14 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'He/She will work as the Technical Leader for our Ongoing Embedded Projects.',
        'Candidate will be responsible for defining and governing overall system architecture for ECUs which Includes HW and SW.',
        'Additionally he/she will manage the team leaders from SW, HW and V&V divisions.',
        'B.E/B.Tech (Electronics/Electrical/Computer Science)',
        'CDAC certification (VLSI or similar) will be considered as an added advantage',
      ],
      postingDate: null,
      closingDate: null,
      jobDescription: [
        'Job Responsibilities',
        '- He/She will work as the Technical Leader for our Ongoing Embedded Projects.',
        '- Candidate will be responsible for defining and governing overall system architecture for ECUs which Includes HW and SW.',
        '- Additionally he/she will manage the team leaders from SW, HW and V&V divisions.',
        '',
        'Job Qualifications',
        '- B.E/B.Tech (Electronics/Electrical/Computer Science)',
        '- CDAC certification (VLSI or similar) will be considered as an added advantage',
      ].join('\n'),
      companyCareerPage: 'https://www.endurancegroup.com/careers/',
      companyDomain: 'endurancegroup.com',
      atsPlatform: 'official-company-careers',
    },
  )
})

test('Endurance Technologies run validates the first-party careers page, browser-rendered portal, and same-domain detail pages', async () => {
  const enduranceTechnologies = await loadModule()
  const requestedUrls = []

  let currentStage = 'careers'

  const fakePage = {
    goto: async (url) => {
      requestedUrls.push(url)

      if (url === enduranceTechnologies.CAREERS_URL) {
        currentStage = 'careers'
        return
      }

      if (url === enduranceTechnologies.JOB_PORTAL_URL) {
        currentStage = 'job-portal'
        return
      }

      if (url === 'https://www.endurancegroup.com/career/technical-architect/') {
        currentStage = 'technical-architect'
        return
      }

      if (url === 'https://www.endurancegroup.com/career/technical-lead-hardware/') {
        currentStage = 'technical-lead-hardware'
        return
      }

      throw new Error(`Unexpected Endurance Technologies URL: ${url}`)
    },
    waitForSelector: async () => {},
    content: async () => {
      if (currentStage === 'careers') return careersHtml
      if (currentStage === 'job-portal') return jobPortalHtml
      if (currentStage === 'technical-architect') return technicalArchitectDetailHtml
      if (currentStage === 'technical-lead-hardware') return technicalLeadHardwareDetailHtml
      throw new Error(`Unexpected stage: ${currentStage}`)
    },
    evaluate: async () => {
      if (currentStage !== 'job-portal') {
        throw new Error(`Unexpected evaluate stage: ${currentStage}`)
      }

      return [
        {
          title: 'Job Opening for Technical Architect',
          experience: '14 Years',
          designation: 'Assistant Manager',
          location: 'Pune',
          sourceUrl: 'https://www.endurancegroup.com/career/technical-architect/',
        },
        {
          title: 'Job Opening for Technical Lead – Hardware',
          experience: '7 Years',
          designation: 'Assistant Manager',
          location: 'Pune',
          sourceUrl: 'https://www.endurancegroup.com/career/technical-lead-hardware/',
        },
        {
          title: 'Job Opening for Technical Member – Hardware',
          experience: '4 Years',
          designation: 'Assistant Manager',
          location: 'Pune',
          sourceUrl: 'https://www.endurancegroup.com/career/technical-member-hardware/',
        },
      ]
    },
  }

  const jobs = await enduranceTechnologies.createEnduranceTechnologiesScraper({
    launchBrowser: async () => ({
      close: async () => {},
    }),
    createOptimizedPage: async () => fakePage,
    now: () => FIXED_SCRAPED_AT,
    maxJobs: 2,
  }).run()

  assert.deepEqual(requestedUrls, [
    enduranceTechnologies.CAREERS_URL,
    enduranceTechnologies.JOB_PORTAL_URL,
    'https://www.endurancegroup.com/career/technical-architect/',
    'https://www.endurancegroup.com/career/technical-lead-hardware/',
  ])
  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => job.title),
    ['Technical Architect', 'Technical Lead – Hardware'],
  )

  assert.deepEqual(jobs[0], {
    title: 'Technical Architect',
    company: 'Endurance Technologies',
    designation: 'Assistant Manager',
    department: null,
    location: 'Pune, Maharashtra, India',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    jobId: 'endurancetechnologies-technical-architect',
    requisitionId: 'endurancetechnologies-technical-architect',
    sourceUrl: 'https://www.endurancegroup.com/career/technical-architect/',
    applyUrl: 'https://www.endurancegroup.com/career/technical-architect/',
    employmentType: null,
    experienceRequired: '14 Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'He/She will work as the Technical Leader for our Ongoing Embedded Projects.',
      'Candidate will be responsible for defining and governing overall system architecture for ECUs which Includes HW and SW.',
      'Additionally he/she will manage the team leaders from SW, HW and V&V divisions.',
      'B.E/B.Tech (Electronics/Electrical/Computer Science)',
      'CDAC certification (VLSI or similar) will be considered as an added advantage',
    ],
    postingDate: null,
    closingDate: null,
    jobDescription: [
      'Job Responsibilities',
      '- He/She will work as the Technical Leader for our Ongoing Embedded Projects.',
      '- Candidate will be responsible for defining and governing overall system architecture for ECUs which Includes HW and SW.',
      '- Additionally he/she will manage the team leaders from SW, HW and V&V divisions.',
      '',
      'Job Qualifications',
      '- B.E/B.Tech (Electronics/Electrical/Computer Science)',
      '- CDAC certification (VLSI or similar) will be considered as an added advantage',
    ].join('\n'),
    companyCareerPage: 'https://www.endurancegroup.com/careers/',
    companyDomain: 'endurancegroup.com',
    atsPlatform: 'official-company-careers',
    source: 'endurancetechnologies',
    link: 'https://www.endurancegroup.com/career/technical-architect/',
    scrapedAt: FIXED_SCRAPED_AT,
  })

  assert.equal(jobs[1].company, 'Endurance Technologies')
  assert.equal(jobs[1].designation, 'Assistant Manager')
  assert.equal(jobs[1].experienceRequired, '7 Years')
  assert.equal(jobs[1].location, 'Pune, Maharashtra, India')
  assert.equal(jobs[1].source, 'endurancetechnologies')
  assert.equal(jobs[1].scrapedAt, FIXED_SCRAPED_AT)
  assert.match(jobs[1].jobDescription, /Hardware Lead/i)
  assert.match(jobs[1].jobDescription, /CDAC certification/i)
})

test('Endurance Technologies fails closed when the careers landing page, job portal, or detail contract drifts', async () => {
  const enduranceTechnologies = await loadModule()

  await assert.rejects(
    enduranceTechnologies.createEnduranceTechnologiesScraper({
      launchBrowser: async () => ({ close: async () => {} }),
      createOptimizedPage: async () => ({
        goto: async () => {},
        waitForSelector: async () => {},
        content: async () => '<html><body><h1>Careers</h1></body></html>',
      }),
    }).run(),
    /careers page no longer matches/i,
  )

  let currentStage = 'careers'
  const brokenPortalPage = {
    goto: async (url) => {
      currentStage = url === enduranceTechnologies.CAREERS_URL ? 'careers' : 'job-portal'
    },
    waitForSelector: async () => {},
    content: async () => currentStage === 'careers'
      ? careersHtml
      : '<html><body><h2>Current Opening</h2><p>Drop your CV here</p></body></html>',
  }

  await assert.rejects(
    enduranceTechnologies.createEnduranceTechnologiesScraper({
      launchBrowser: async () => ({ close: async () => {} }),
      createOptimizedPage: async () => brokenPortalPage,
    }).run(),
    /job portal no longer matches/i,
  )

  currentStage = 'careers'
  const brokenDetailPage = {
    goto: async (url) => {
      if (url === enduranceTechnologies.CAREERS_URL) currentStage = 'careers'
      else if (url === enduranceTechnologies.JOB_PORTAL_URL) currentStage = 'job-portal'
      else currentStage = 'detail'
    },
    waitForSelector: async () => {},
    content: async () => {
      if (currentStage === 'careers') return careersHtml
      if (currentStage === 'job-portal') return jobPortalHtml
      return technicalArchitectDetailHtml.replace('Job Qualifications', 'Qualifications')
    },
    evaluate: async () => ([
      {
        title: 'Job Opening for Technical Architect',
        experience: '14 Years',
        designation: 'Assistant Manager',
        location: 'Pune',
        sourceUrl: 'https://www.endurancegroup.com/career/technical-architect/',
      },
    ]),
  }

  await assert.rejects(
    enduranceTechnologies.createEnduranceTechnologiesScraper({
      launchBrowser: async () => ({ close: async () => {} }),
      createOptimizedPage: async () => brokenDetailPage,
      maxJobs: 1,
    }).run(),
    /job detail no longer matches/i,
  )
})
