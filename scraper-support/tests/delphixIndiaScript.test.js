import assert from 'node:assert/strict'
import test from 'node:test'

const officialHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Perforce Delphix | Intelligent Data Automation Platform</title>
  </head>
  <body>
    <main>
      <p>Perforce Delphix</p>
      <h1>Make Data Fast, Trusted, and AI-Ready</h1>
      <p>The Intelligent Data Automation Platform</p>
    </main>
  </body>
</html>
`

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Perforce Software</title>
  </head>
  <body>
    <main>
      <p>Careers</p>
      <h1>Perforce, Powered by People</h1>
      <p>Work that matters. People who care. A place to grow.</p>
      <a href="https://jobs.lever.co/perforce" class="p4-cta">Browse Open Positions</a>
    </main>
  </body>
</html>
`

const officialLeverBoardHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Perforce</h1>
    <section>Location type</section>
    <section>Location</section>
    <a class="category-link" href="?location=Pune%2C%20Maharashtra" rel="nofollow">Pune, Maharashtra</a>
    <section>Team</section>
    <section>Work type</section>
    <a class="posting-title" href="https://jobs.lever.co/perforce/30f38ba2-01e2-43c3-a5b9-f4d493772961">
      <h5 data-qa="posting-name">Business Development Representative, Delphix</h5>
    </a>
    <a class="posting-title" href="https://jobs.lever.co/perforce/0f4dcc28-cb87-495e-9a9f-a10b710b7fd6">
      <h5 data-qa="posting-name">Enterprise Account Executive, Delphix</h5>
    </a>
    <span>Jobs powered by </span>
  </body>
</html>
`

const sampleLeverJobs = [
  {
    id: 'delphix-india-sales-engineer',
    text: 'Senior Sales Engineer - Delphix',
    hostedUrl: 'https://jobs.lever.co/perforce/delphix-india-sales-engineer',
    applyUrl: 'https://jobs.lever.co/perforce/delphix-india-sales-engineer/apply',
    createdAt: 1_783_894_400_000,
    categories: {
      location: 'Pune, Maharashtra',
      team: 'Technical Sales',
      department: 'Sales',
      commitment: 'Full-Time',
      allLocations: ['Pune, Maharashtra'],
    },
    workplaceType: 'hybrid',
    descriptionPlain: 'Support Delphix enterprise sales motions from India.',
  },
  {
    id: 'delphix-london-ae',
    text: 'Enterprise Account Executive, Delphix',
    hostedUrl: 'https://jobs.lever.co/perforce/delphix-london-ae',
    applyUrl: 'https://jobs.lever.co/perforce/delphix-london-ae/apply',
    createdAt: 1_781_728_000_000,
    categories: {
      location: 'London',
      team: 'Sales',
      department: 'Sales',
      commitment: 'Full-Time',
      allLocations: ['London'],
    },
    workplaceType: 'remote',
    descriptionPlain: 'Drive Delphix growth in the United Kingdom.',
  },
  {
    id: 'perforce-pune-security',
    text: 'Product Security Engineer (LF)',
    hostedUrl: 'https://jobs.lever.co/perforce/perforce-pune-security',
    applyUrl: 'https://jobs.lever.co/perforce/perforce-pune-security/apply',
    createdAt: 1_781_705_700_000,
    categories: {
      location: 'Pune, Maharashtra',
      team: 'Information Security',
      department: 'Information Security',
      commitment: 'Full-Time',
      allLocations: ['Pune, Maharashtra'],
    },
    workplaceType: 'hybrid',
    descriptionPlain: 'Platform security role for a non-Delphix Perforce product line.',
  },
]

const liveBoardShapeWithoutDelphixIndiaJobs = [
  {
    id: '30f38ba2-01e2-43c3-a5b9-f4d493772961',
    text: 'Business Development Representative, Delphix',
    hostedUrl: 'https://jobs.lever.co/perforce/30f38ba2-01e2-43c3-a5b9-f4d493772961',
    applyUrl: 'https://jobs.lever.co/perforce/30f38ba2-01e2-43c3-a5b9-f4d493772961/apply',
    createdAt: 1_758_661_890_409,
    categories: {
      location: 'Austin, TX',
      team: 'Sales Development',
      department: 'Marketing',
      commitment: 'Full-Time',
      allLocations: ['Austin, TX'],
    },
    workplaceType: 'hybrid',
    descriptionPlain: 'Current Delphix-branded role outside India.',
  },
  {
    id: 'b46852c0-360e-42fd-9c85-814f64aa3588',
    text: 'Product Security Engineer (LF)',
    hostedUrl: 'https://jobs.lever.co/perforce/b46852c0-360e-42fd-9c85-814f64aa3588',
    applyUrl: 'https://jobs.lever.co/perforce/b46852c0-360e-42fd-9c85-814f64aa3588/apply',
    createdAt: 1_781_705_700_247,
    categories: {
      location: 'Pune, Maharashtra',
      team: 'Information Security',
      department: 'Information Security',
      commitment: 'Full-Time',
      allLocations: ['Pune, Maharashtra'],
    },
    workplaceType: 'hybrid',
    descriptionPlain: 'Current India role for a non-Delphix Perforce product line.',
  },
]

const loadModule = async () => {
  try {
    return await import('../../scraper/delphixindia/script.js')
  } catch {
    assert.fail('Expected Delphix India scraper module at ../../scraper/delphixindia/script.js')
  }
}

test('Delphix India pins the verified Delphix homepage redirect, Perforce careers page, and Lever board contract', async () => {
  const delphixIndia = await loadModule()

  assert.equal(delphixIndia.SOURCE, 'delphixindia')
  assert.equal(delphixIndia.COMPANY, 'Delphix India')
  assert.equal(delphixIndia.HOMEPAGE_URL, 'https://www.delphix.com/')
  assert.equal(delphixIndia.RESOLVED_HOMEPAGE_URL, 'https://www.perforce.com/products/delphix')
  assert.equal(delphixIndia.CAREERS_URL, 'https://www.perforce.com/careers')
  assert.equal(delphixIndia.LEVER_BOARD_URL, 'https://jobs.lever.co/perforce')
  assert.equal(
    delphixIndia.LEVER_API_URL,
    'https://api.lever.co/v0/postings/perforce?mode=json',
  )
  assert.equal(delphixIndia.BRAND_KEYWORD, 'delphix')
  assert.equal(delphixIndia.VERIFIED_INDIA_LOCATION_NAME, 'Pune, Maharashtra')
  assert.equal(delphixIndia.hasOfficialHomepageSignal(officialHomepageHtml), true)
  assert.equal(delphixIndia.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(
    delphixIndia.extractLeverBoardUrl(officialCareersHtml),
    'https://jobs.lever.co/perforce',
  )
  assert.equal(delphixIndia.hasOfficialLeverBoardSignal(officialLeverBoardHtml), true)
})

test('Delphix India extracts only roles that are both Delphix-branded and in the verified India location', async () => {
  const delphixIndia = await loadModule()
  const jobs = delphixIndia.extractDelphixIndiaJobs(sampleLeverJobs)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior Sales Engineer - Delphix',
    company: 'Delphix India',
    department: 'Technical Sales',
    location: 'Pune, Maharashtra',
    city: 'Pune',
    country: 'India',
    jobId: 'delphix-india-sales-engineer',
    requisitionId: 'delphix-india-sales-engineer',
    sourceUrl: 'https://jobs.lever.co/perforce/delphix-india-sales-engineer',
    applyUrl: 'https://jobs.lever.co/perforce/delphix-india-sales-engineer/apply',
    employmentType: 'Full-Time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-12T22:13:20.000Z',
    closingDate: null,
    jobDescription: 'Support Delphix enterprise sales motions from India.',
    remoteStatus: 'Hybrid',
  })
})

test('Delphix India run returns an honest zero-job result while the verified board exposes Delphix roles and India roles but no overlap', async () => {
  const delphixIndia = await loadModule()
  const requestedPages = []
  const requestedJson = []

  const jobs = await delphixIndia.createDelphixIndiaScraper({
    now: () => '2026-07-15T00:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === delphixIndia.HOMEPAGE_URL) {
        return {
          status: 200,
          url: delphixIndia.RESOLVED_HOMEPAGE_URL,
          html: officialHomepageHtml,
        }
      }

      if (url === delphixIndia.CAREERS_URL) {
        return {
          status: 200,
          url,
          html: officialCareersHtml,
        }
      }

      if (url === delphixIndia.LEVER_BOARD_URL) {
        return {
          status: 200,
          url,
          html: officialLeverBoardHtml,
        }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)

      if (url === delphixIndia.LEVER_API_URL) {
        return liveBoardShapeWithoutDelphixIndiaJobs
      }

      throw new Error(`Unexpected json URL: ${url}`)
    },
  })

  assert.deepEqual(requestedPages, [
    delphixIndia.HOMEPAGE_URL,
    delphixIndia.CAREERS_URL,
    delphixIndia.LEVER_BOARD_URL,
  ])
  assert.deepEqual(requestedJson, [delphixIndia.LEVER_API_URL])
  assert.deepEqual(jobs, [])
})

test('Delphix India fails closed when the verified homepage, careers handoff, or Delphix board slice changes materially', async () => {
  const delphixIndia = await loadModule()

  await assert.rejects(
    delphixIndia.createDelphixIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === delphixIndia.HOMEPAGE_URL) {
          return {
            status: 200,
            url: delphixIndia.RESOLVED_HOMEPAGE_URL,
            html: '<html><body><h1>Delphix</h1></body></html>',
          }
        }

        throw new Error(`Unexpected page URL: ${url}`)
      },
      fetchJson: async () => liveBoardShapeWithoutDelphixIndiaJobs,
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    delphixIndia.createDelphixIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === delphixIndia.HOMEPAGE_URL) {
          return {
            status: 200,
            url: delphixIndia.RESOLVED_HOMEPAGE_URL,
            html: officialHomepageHtml,
          }
        }

        if (url === delphixIndia.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: officialCareersHtml.replace(
              'https://jobs.lever.co/perforce',
              'https://jobs.lever.co/other-company',
            ),
          }
        }

        throw new Error(`Unexpected page URL: ${url}`)
      },
      fetchJson: async () => liveBoardShapeWithoutDelphixIndiaJobs,
    }),
    /verified public lever board/i,
  )

  await assert.rejects(
    delphixIndia.createDelphixIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === delphixIndia.HOMEPAGE_URL) {
          return {
            status: 200,
            url: delphixIndia.RESOLVED_HOMEPAGE_URL,
            html: officialHomepageHtml,
          }
        }

        if (url === delphixIndia.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: officialCareersHtml,
          }
        }

        if (url === delphixIndia.LEVER_BOARD_URL) {
          return {
            status: 200,
            url,
            html: officialLeverBoardHtml,
          }
        }

        throw new Error(`Unexpected page URL: ${url}`)
      },
      fetchJson: async () => [
        {
          id: 'pune-non-delphix',
          text: 'Senior DevOps Engineer III (P4 Cloud)',
          hostedUrl: 'https://jobs.lever.co/perforce/pune-non-delphix',
          applyUrl: 'https://jobs.lever.co/perforce/pune-non-delphix/apply',
          createdAt: 1_783_949_215_929,
          categories: {
            location: 'Pune, Maharashtra',
            team: 'Development',
            department: 'Development',
            commitment: 'Full-Time',
            allLocations: ['Pune, Maharashtra'],
          },
          workplaceType: 'hybrid',
          descriptionPlain: 'Current India role for another Perforce product line.',
        },
      ],
    }),
    /delphix-branded roles/i,
  )
})
