import assert from 'node:assert/strict'
import test from 'node:test'

const loadDailyRoundsModule = async () => {
  try {
    return await import('../dailyrounds/script.js')
  } catch {
    return null
  }
}

const verifiedHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>DailyRounds</title>
    <meta
      name="description"
      content="DailyRounds helps doctors stay updated with medical knowledge while Marrow and DBMCI One support exam prep."
    />
  </head>
  <body>
    <main>
      <h1>DailyRounds</h1>
      <p>DailyRounds, Marrow and DBMCI One are products from Neuroglia Health.</p>
      <p>India's platform for doctors to learn, discuss and stay updated.</p>
    </main>
  </body>
</html>
`

const verifiedCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - DailyRounds</title>
  </head>
  <body>
    <main>
      <h1>Explore a career with Marrow, DailyRounds or DBMCI One</h1>
      <p>Open Positions</p>
      <p>Marrow</p>
      <p>DailyRounds</p>
      <p>DBMCI One</p>
      <p>Neuroglia Health Pvt Limited</p>
    </main>
    <script type="module">
      document.addEventListener("astro:page-load", async () => {
        const response = await fetch("/api/careers");
        window.dispatchEvent(new CustomEvent("careers-data-ready", { detail: await response.json() }));
      });
    </script>
  </body>
</html>
`

const verifiedDoctorCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Doctor Careers - DailyRounds</title>
  </head>
  <body>
    <main>
      <h1>An academic career option for Doctors at Marrow, DailyRounds &amp; DBMCI One</h1>
      <p>Open positions</p>
      <p>Neuroglia Health Pvt Limited</p>
    </main>
    <script type="module">
      document.addEventListener("astro:page-load", async () => {
        const response = await fetch("/api/careers/doctor");
        window.dispatchEvent(new CustomEvent("doctor-data-ready", { detail: await response.json() }));
      });
    </script>
  </body>
</html>
`

const verifiedCareersApiPayload = {
  job_openings: [
    {
      id: 1,
      roleNames: 'Academic roles for MBBS/MD Doctors',
      team: 'Doctors',
      type: 'doctors',
      url: '/careers/doctor',
    },
    {
      roleNames: 'Software Development Engineer I - Backend',
      team: 'Tech',
      updatedOn: '23 Mar 2026',
      url: 'SDEI',
    },
    {
      roleNames: 'Business Development Executive ',
      team: 'Sales',
      updatedOn: '23 Mar 2026',
      url: 'BDE',
    },
    {
      roleNames: 'Performance Marketing Manager',
      team: 'Dailyrounds',
      updatedOn: '2 June',
      url: 'Performance_Marketing_Manager',
    },
  ],
  updated_on: '07 July 2026',
}

const verifiedDoctorCareersApiPayload = {
  job_openings: [],
  updated_on: '',
}

const verifiedGeneralDetailsBySlug = {
  SDEI: {
    job_details: {
      applyNowLink: 'https://short.mynexthire.io/1156-CjxBJnbo5nwm2bRF1sbm',
      do: [
        'Build and secure systems used by 300k+ doctors daily',
        'Work on large-scale streaming infrastructure',
      ],
      exists: true,
      have: [
        '1-2 years of hands-on experience in Python or Go',
        'Experience building and securing REST APIs',
      ],
      location: 'Bengaluru ',
      role: 'Software Development Engineer I - Backend',
      team: 'Tech',
    },
  },
  BDE: {
    job_details: {},
    previous_context: 'all',
  },
  Performance_Marketing_Manager: {
    job_details: {
      applyNowLink: 'https://short.mynexthire.io/1156-21z3LHgA3o5Q3Boc7AKS',
      do: [
        'Own growth, lead generation, and revenue targets across all programmes',
      ],
      exists: true,
      have: [
        '4-6 years of hands-on performance marketing experience of direct B2C',
        'Strong expertise in Google Ads and Meta Ads platforms',
      ],
      location: 'Bengaluru ',
      role: 'Performance Marketing Manager',
      team: 'Dailyrounds',
    },
  },
}

test('Daily Rounds validates the verified homepage, careers pages, and same-origin first-party listing APIs', async () => {
  const dailyRounds = await loadDailyRoundsModule()
  assert.ok(dailyRounds, 'Expected Daily Rounds scraper module at ../dailyrounds/script.js')

  assert.equal(dailyRounds.hasOfficialHomepageSignal(verifiedHomepageHtml), true)
  assert.equal(dailyRounds.hasOfficialCareersSignal(verifiedCareersHtml), true)
  assert.equal(dailyRounds.hasOfficialDoctorCareersSignal(verifiedDoctorCareersHtml), true)
  assert.equal(dailyRounds.hasValidCareersListingPayload(verifiedCareersApiPayload), true)
  assert.equal(dailyRounds.hasValidDoctorListingPayload(verifiedDoctorCareersApiPayload), true)
})

test('Daily Rounds run validates the first-party flow, sends same-origin API context, skips the generic doctor landing card, and returns normalized jobs', async () => {
  const dailyRounds = await loadDailyRoundsModule()
  assert.ok(dailyRounds, 'Expected Daily Rounds scraper module at ../dailyrounds/script.js')

  const requestedTextUrls = []
  const requestedJsonCalls = []

  const jobs = await dailyRounds.createDailyRoundsScraper({
    now: () => '2026-07-14T10:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)

      if (url === dailyRounds.HOMEPAGE_URL) return verifiedHomepageHtml
      if (url === dailyRounds.CAREERS_URL) return verifiedCareersHtml
      if (url === dailyRounds.DOCTOR_CAREERS_URL) return verifiedDoctorCareersHtml

      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requestedJsonCalls.push({
        url,
        referer: options.referer ?? null,
      })

      if (url === dailyRounds.CAREERS_API_URL) return verifiedCareersApiPayload
      if (url === dailyRounds.DOCTOR_CAREERS_API_URL) return verifiedDoctorCareersApiPayload
      if (url === 'https://dailyrounds.org/api/careers/profile/SDEI') {
        return verifiedGeneralDetailsBySlug.SDEI
      }
      if (url === 'https://dailyrounds.org/api/careers/profile/BDE') {
        return verifiedGeneralDetailsBySlug.BDE
      }
      if (url === 'https://dailyrounds.org/api/careers/profile/Performance_Marketing_Manager') {
        return verifiedGeneralDetailsBySlug.Performance_Marketing_Manager
      }

      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedTextUrls, [
    dailyRounds.HOMEPAGE_URL,
    dailyRounds.CAREERS_URL,
    dailyRounds.DOCTOR_CAREERS_URL,
  ])
  assert.deepEqual(requestedJsonCalls, [
    { url: dailyRounds.CAREERS_API_URL, referer: dailyRounds.CAREERS_URL },
    { url: dailyRounds.DOCTOR_CAREERS_API_URL, referer: dailyRounds.DOCTOR_CAREERS_URL },
    { url: 'https://dailyrounds.org/api/careers/profile/SDEI', referer: dailyRounds.CAREERS_URL },
    { url: 'https://dailyrounds.org/api/careers/profile/BDE', referer: dailyRounds.CAREERS_URL },
    {
      url: 'https://dailyrounds.org/api/careers/profile/Performance_Marketing_Manager',
      referer: dailyRounds.CAREERS_URL,
    },
  ])

  assert.deepEqual(
    jobs.map((job) => job.title),
    [
      'Performance Marketing Manager',
      'Software Development Engineer I - Backend',
    ],
  )
  assert.equal(jobs.some((job) => job.jobId === 'dailyrounds-bde'), false)

  const backendRole = jobs.find((job) => job.jobId === 'dailyrounds-sdei')
  const marketingRole = jobs.find((job) => job.jobId === 'dailyrounds-performance-marketing-manager')

  assert.deepEqual(backendRole, {
    title: 'Software Development Engineer I - Backend',
    company: 'Daily Rounds',
    department: 'Tech',
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: 'dailyrounds-sdei',
    requisitionId: 'dailyrounds-sdei',
    sourceUrl: 'https://dailyrounds.org/careers/profile/SDEI',
    applyUrl: 'https://short.mynexthire.io/1156-CjxBJnbo5nwm2bRF1sbm',
    employmentType: null,
    workplaceType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      '1-2 years of hands-on experience in Python or Go',
      'Experience building and securing REST APIs',
    ],
    compensation: null,
    postingDate: null,
    closingDate: null,
    jobDescription: [
      'What would you be doing here?',
      '- Build and secure systems used by 300k+ doctors daily',
      '- Work on large-scale streaming infrastructure',
      'The best-fit candidate would have:',
      '- 1-2 years of hands-on experience in Python or Go',
      '- Experience building and securing REST APIs',
    ].join('\n'),
    source: 'dailyrounds',
    companyCareerPage: 'https://dailyrounds.org/careers',
    companyDomain: 'dailyrounds.org',
    atsPlatform: 'official-company-careers',
    link: 'https://short.mynexthire.io/1156-CjxBJnbo5nwm2bRF1sbm',
    scrapedAt: '2026-07-14T10:00:00.000Z',
  })

  assert.deepEqual(marketingRole, {
    title: 'Performance Marketing Manager',
    company: 'Daily Rounds',
    department: 'Dailyrounds',
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: 'dailyrounds-performance-marketing-manager',
    requisitionId: 'dailyrounds-performance-marketing-manager',
    sourceUrl: 'https://dailyrounds.org/careers/profile/Performance_Marketing_Manager',
    applyUrl: 'https://short.mynexthire.io/1156-21z3LHgA3o5Q3Boc7AKS',
    employmentType: null,
    workplaceType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      '4-6 years of hands-on performance marketing experience of direct B2C',
      'Strong expertise in Google Ads and Meta Ads platforms',
    ],
    compensation: null,
    postingDate: null,
    closingDate: null,
    jobDescription: [
      'What would you be doing here?',
      '- Own growth, lead generation, and revenue targets across all programmes',
      'The best-fit candidate would have:',
      '- 4-6 years of hands-on performance marketing experience of direct B2C',
      '- Strong expertise in Google Ads and Meta Ads platforms',
    ].join('\n'),
    source: 'dailyrounds',
    companyCareerPage: 'https://dailyrounds.org/careers',
    companyDomain: 'dailyrounds.org',
    atsPlatform: 'official-company-careers',
    link: 'https://short.mynexthire.io/1156-21z3LHgA3o5Q3Boc7AKS',
    scrapedAt: '2026-07-14T10:00:00.000Z',
  })
})

test('Daily Rounds fails closed when the verified homepage, careers shell, or every role detail payload drifts', async () => {
  const dailyRounds = await loadDailyRoundsModule()
  assert.ok(dailyRounds, 'Expected Daily Rounds scraper module at ../dailyrounds/script.js')

  await assert.rejects(
    dailyRounds.createDailyRoundsScraper().run({
      fetchText: async (url) => {
        if (url === dailyRounds.HOMEPAGE_URL) return '<html><title>Unexpected</title></html>'
        if (url === dailyRounds.CAREERS_URL) return verifiedCareersHtml
        if (url === dailyRounds.DOCTOR_CAREERS_URL) return verifiedDoctorCareersHtml
        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchJson: async (url) => {
        if (url === dailyRounds.CAREERS_API_URL) return verifiedCareersApiPayload
        if (url === dailyRounds.DOCTOR_CAREERS_API_URL) return verifiedDoctorCareersApiPayload
        throw new Error(`Unexpected JSON URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    dailyRounds.createDailyRoundsScraper().run({
      fetchText: async (url) => {
        if (url === dailyRounds.HOMEPAGE_URL) return verifiedHomepageHtml
        if (url === dailyRounds.CAREERS_URL) {
          return verifiedCareersHtml.replace('/api/careers', '/api/roles')
        }
        if (url === dailyRounds.DOCTOR_CAREERS_URL) return verifiedDoctorCareersHtml
        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchJson: async (url) => {
        if (url === dailyRounds.CAREERS_API_URL) return verifiedCareersApiPayload
        if (url === dailyRounds.DOCTOR_CAREERS_API_URL) return verifiedDoctorCareersApiPayload
        throw new Error(`Unexpected JSON URL: ${url}`)
      },
    }),
    /verified careers page/i,
  )

  await assert.rejects(
    dailyRounds.createDailyRoundsScraper().run({
      fetchText: async (url) => {
        if (url === dailyRounds.HOMEPAGE_URL) return verifiedHomepageHtml
        if (url === dailyRounds.CAREERS_URL) return verifiedCareersHtml
        if (url === dailyRounds.DOCTOR_CAREERS_URL) return verifiedDoctorCareersHtml
        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchJson: async (url) => {
        if (url === dailyRounds.CAREERS_API_URL) return verifiedCareersApiPayload
        if (url === dailyRounds.DOCTOR_CAREERS_API_URL) return verifiedDoctorCareersApiPayload
        if (url === 'https://dailyrounds.org/api/careers/profile/SDEI') {
          return { job_details: {} }
        }
        if (url === 'https://dailyrounds.org/api/careers/profile/BDE') {
          return { job_details: {} }
        }
        if (url === 'https://dailyrounds.org/api/careers/profile/Performance_Marketing_Manager') {
          return { job_details: {} }
        }
        throw new Error(`Unexpected JSON URL: ${url}`)
      },
    }),
    /no verified job details/i,
  )
})
