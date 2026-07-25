import assert from 'node:assert/strict'
import test from 'node:test'

const CAREERS_LANDING_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Nagarro</title>
  </head>
  <body>
    <main>
      <h1>Thinking about becoming a Nagarrian?</h1>
      <h2>Find more details and open positions on these locations</h2>
      <p>China India Japan Philippines Singapore South Africa Sri Lanka Thailand</p>
    </main>
  </body>
</html>
`

const JOB_SEARCH_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Search | Career opportunities with Nagarro | Explore now</title>
  </head>
  <body>
    <main>
      <h1>Your future starts here</h1>
      <h2>Didn't find any open position?</h2>
      <p>All hope is not lost. Feel free to send us your application anyway. You never know.</p>
      <a
        href="https://join.smartrecruiters.com/Nagarro1/338a6454-a0d3-4121-a6c2-51696acb91a3-website-applications"
      >
        Apply
      </a>
    </main>
  </body>
</html>
`

const SMARTRECRUITERS_BOARD_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Nagarro</title>
  </head>
  <body>
    <h1>Jobs at Nagarro</h1>
    <section>
      <h3>Bengaluru, India</h3>
      <span>32 jobs</span>
    </section>
    <section>
      <h3>Remote, India</h3>
      <span>342 jobs</span>
    </section>
  </body>
</html>
`

const LISTINGS_PAYLOAD = {
  totalFound: 1,
  content: [
    {
      id: '744000138066871',
      name: 'Associate Principal Engineer, Dotnet Fullstack',
      refNumber: 'REF-NAG-100',
      releasedDate: '2026-07-10T08:15:00.000Z',
      location: {
        city: 'Chennai',
        region: '',
        country: 'in',
        fullLocation: 'Chennai, , India',
      },
      company: {
        identifier: 'Nagarro1',
        name: 'Nagarro',
      },
      department: {
        id: 'engineering',
        label: 'Engineering',
      },
      typeOfEmployment: {
        id: 'full-time',
        label: 'Full-time',
      },
      experienceLevel: {
        id: 'not-applicable',
        label: 'Not Applicable',
      },
      ref: 'https://api.smartrecruiters.com/v1/companies/Nagarro1/postings/744000138066871',
    },
  ],
}

const DETAIL_PAYLOAD = {
  id: '744000138066871',
  name: 'Associate Principal Engineer, Dotnet Fullstack',
  refNumber: 'REF-NAG-100',
  releasedDate: '2026-07-10T08:15:00.000Z',
  postingUrl:
    'https://jobs.smartrecruiters.com/Nagarro1/744000138066871-associate-principal-engineer-dotnet-fullstack',
  applyUrl:
    'https://jobs.smartrecruiters.com/Nagarro1/744000138066871-associate-principal-engineer-dotnet-fullstack?oga=true',
  location: {
    city: 'Chennai',
    region: '',
    country: 'in',
    fullLocation: 'Chennai, , India',
  },
  department: {
    id: 'engineering',
    label: 'Engineering',
  },
  typeOfEmployment: {
    id: 'full-time',
    label: 'Full-time',
  },
  experienceLevel: {
    id: 'not-applicable',
    label: 'Not Applicable',
  },
  jobAd: {
    sections: {
      jobDescription: {
        text: `
          <p>Build and maintain distributed backend services for enterprise clients.</p>
        `,
      },
      qualifications: {
        text: `
          <p>Strong experience with .NET, microservices, and modern cloud-native engineering.</p>
        `,
      },
      additionalInformation: {
        text: `
          <p>Experience collaborating with globally distributed engineering teams is preferred.</p>
        `,
      },
    },
  },
}

const loadModule = async () => {
  try {
    return await import('../nagarro/script.js')
  } catch {
    assert.fail('Expected Nagarro scraper module at ../nagarro/script.js')
  }
}

test('Nagarro constants stay pinned to the verified first-party careers pages and SmartRecruiters board', async () => {
  const nagarro = await loadModule()

  assert.equal(nagarro.SOURCE, 'nagarro')
  assert.equal(nagarro.COMPANY, 'Nagarro')
  assert.equal(nagarro.OFFICIAL_BRAND_NAME, 'Nagarro')
  assert.equal(nagarro.VERIFIED_ON, '2026-07-16')
  assert.equal(nagarro.CAREERS_LANDING_URL, 'https://www.nagarro.com/en/careers')
  assert.equal(nagarro.JOB_SEARCH_URL, 'https://www.nagarro.com/en/careers/job-search')
  assert.equal(nagarro.SMARTRECRUITERS_BOARD_URL, 'https://careers.smartrecruiters.com/Nagarro1')
  assert.equal(
    nagarro.SMARTRECRUITERS_LISTING_API_URL,
    'https://api.smartrecruiters.com/v1/companies/Nagarro1/postings',
  )
  assert.equal(
    nagarro.SMARTRECRUITERS_DETAIL_API_URL_TEMPLATE,
    'https://api.smartrecruiters.com/v1/companies/Nagarro1/postings/{{jobId}}',
  )
  assert.equal(
    nagarro.SMARTRECRUITERS_APPLY_URL,
    'https://join.smartrecruiters.com/Nagarro1/338a6454-a0d3-4121-a6c2-51696acb91a3-website-applications',
  )
  assert.equal(nagarro.hasOfficialCareersLandingSignal(CAREERS_LANDING_HTML), true)
  assert.equal(nagarro.hasOfficialJobSearchSignal(JOB_SEARCH_HTML), true)
  assert.equal(nagarro.hasVerifiedSmartRecruitersBoardSignal(SMARTRECRUITERS_BOARD_HTML), true)
  assert.equal(
    nagarro.extractSmartRecruitersCompanyIdentifier(DETAIL_PAYLOAD.postingUrl),
    'Nagarro1',
  )
})

test('Nagarro validates the first-party careers surface and maps SmartRecruiters India jobs', async () => {
  const nagarro = await loadModule()
  const requestedUrls = []

  const jobs = await nagarro.createNagarroScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === nagarro.CAREERS_LANDING_URL) return CAREERS_LANDING_HTML
      if (url === nagarro.JOB_SEARCH_URL) return JOB_SEARCH_HTML
      if (url === nagarro.SMARTRECRUITERS_BOARD_URL) return SMARTRECRUITERS_BOARD_HTML

      throw new Error(`Unexpected Nagarro text fixture URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requestedUrls.push(url)

      if (
        url
        === 'https://api.smartrecruiters.com/v1/companies/Nagarro1/postings?limit=100&country=in&offset=0'
      ) {
        assert.equal(options.method, 'GET')
        return LISTINGS_PAYLOAD
      }

      if (url === 'https://api.smartrecruiters.com/v1/companies/Nagarro1/postings/744000138066871') {
        return DETAIL_PAYLOAD
      }

      throw new Error(`Unexpected Nagarro JSON fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    nagarro.CAREERS_LANDING_URL,
    nagarro.JOB_SEARCH_URL,
    nagarro.SMARTRECRUITERS_BOARD_URL,
    'https://api.smartrecruiters.com/v1/companies/Nagarro1/postings?limit=100&country=in&offset=0',
    'https://api.smartrecruiters.com/v1/companies/Nagarro1/postings/744000138066871',
  ])

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Associate Principal Engineer, Dotnet Fullstack',
    company: 'Nagarro',
    location: 'Chennai, , India',
    city: 'Chennai',
    country: 'India',
    link:
      'https://jobs.smartrecruiters.com/Nagarro1/744000138066871-associate-principal-engineer-dotnet-fullstack',
    applyUrl:
      'https://jobs.smartrecruiters.com/Nagarro1/744000138066871-associate-principal-engineer-dotnet-fullstack?oga=true',
    sourceUrl:
      'https://jobs.smartrecruiters.com/Nagarro1/744000138066871-associate-principal-engineer-dotnet-fullstack',
    source: 'nagarro',
    jobId: '744000138066871',
    requisitionId: 'REF-NAG-100',
    department: 'Engineering',
    employmentType: 'Full-time',
    experienceRequired: null,
    experienceLevel: 'Not Applicable',
    postingDate: '2026-07-10T08:15:00.000Z',
    jobDescription: jobs[0].jobDescription,
    minimumQualification: jobs[0].minimumQualification,
    preferredQualification: jobs[0].preferredQualification,
    requiredSkills: [],
    remoteStatus: 'On-site',
    scrapedAt: jobs[0].scrapedAt,
  })

  assert.match(jobs[0].jobDescription ?? '', /distributed backend services/i)
  assert.match(jobs[0].minimumQualification ?? '', /microservices/i)
  assert.match(jobs[0].preferredQualification ?? '', /distributed engineering teams/i)
})

test('Nagarro fails closed when the verified first-party careers surface or SmartRecruiters company wiring drifts', async () => {
  const nagarro = await loadModule()

  await assert.rejects(
    nagarro.createNagarroScraper().run({
      fetchText: async (url) => {
        if (url === nagarro.CAREERS_LANDING_URL) return '<html><body><h1>Nagarro</h1></body></html>'
        if (url === nagarro.JOB_SEARCH_URL) return JOB_SEARCH_HTML
        if (url === nagarro.SMARTRECRUITERS_BOARD_URL) return SMARTRECRUITERS_BOARD_HTML
        throw new Error(`Unexpected Nagarro text fixture URL: ${url}`)
      },
      fetchJson: async () => LISTINGS_PAYLOAD,
    }),
    /official careers landing page changed/i,
  )

  await assert.rejects(
    nagarro.createNagarroScraper().run({
      fetchText: async (url) => {
        if (url === nagarro.CAREERS_LANDING_URL) return CAREERS_LANDING_HTML
        if (url === nagarro.JOB_SEARCH_URL) return '<html><body><h1>Search</h1></body></html>'
        if (url === nagarro.SMARTRECRUITERS_BOARD_URL) return SMARTRECRUITERS_BOARD_HTML
        throw new Error(`Unexpected Nagarro text fixture URL: ${url}`)
      },
      fetchJson: async () => LISTINGS_PAYLOAD,
    }),
    /official job-search page changed/i,
  )

  await assert.rejects(
    nagarro.createNagarroScraper().run({
      fetchText: async (url) => {
        if (url === nagarro.CAREERS_LANDING_URL) return CAREERS_LANDING_HTML
        if (url === nagarro.JOB_SEARCH_URL) return JOB_SEARCH_HTML
        if (url === nagarro.SMARTRECRUITERS_BOARD_URL) return '<html><body><h1>Careers</h1></body></html>'
        throw new Error(`Unexpected Nagarro text fixture URL: ${url}`)
      },
      fetchJson: async () => LISTINGS_PAYLOAD,
    }),
    /smartrecruiters board/i,
  )

  await assert.rejects(
    nagarro.createNagarroScraper().run({
      fetchText: async (url) => {
        if (url === nagarro.CAREERS_LANDING_URL) return CAREERS_LANDING_HTML
        if (url === nagarro.JOB_SEARCH_URL) return JOB_SEARCH_HTML
        if (url === nagarro.SMARTRECRUITERS_BOARD_URL) return SMARTRECRUITERS_BOARD_HTML
        throw new Error(`Unexpected Nagarro text fixture URL: ${url}`)
      },
      fetchJson: async (url) => {
        if (
          url
          === 'https://api.smartrecruiters.com/v1/companies/Nagarro1/postings?limit=100&country=in&offset=0'
        ) {
          return LISTINGS_PAYLOAD
        }

        if (url === 'https://api.smartrecruiters.com/v1/companies/Nagarro1/postings/744000138066871') {
          return {
            ...DETAIL_PAYLOAD,
            postingUrl: 'https://jobs.smartrecruiters.com/AnotherCompany/744000138066871-role',
            applyUrl: 'https://jobs.smartrecruiters.com/AnotherCompany/744000138066871-role?oga=true',
          }
        }

        throw new Error(`Unexpected Nagarro JSON fixture URL: ${url}`)
      },
    }),
    /smartrecruiters company identifier changed/i,
  )
})
