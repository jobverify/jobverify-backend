import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Agiloft Careers: Join Our Innovative Team Today</title>
  </head>
  <body>
    <main>
      <h1>Level Up With Us</h1>
      <p>We're defining the future of how enterprises work with contracts.</p>
      <h2>Why work at Agiloft?</h2>
      <p>Join us in defining a new standard.</p>
      <h2>Find your seat</h2>
      <a href="https://jobs.lever.co/agiloft">Explore Open Roles</a>
    </main>
    <footer>2026 © Agiloft Inc. All Rights Reserved</footer>
  </body>
</html>
`

const currentCareersHtmlWithoutLeverHref = `
<!doctype html>
<html lang="en">
  <head>
    <title>Agiloft Careers: Join Our Innovative Team Today</title>
  </head>
  <body>
    <main>
      <h1>Level Up With Us</h1>
      <p>Better contract outcomes start with Agiloft careers.</p>
      <section id="financial-career-growth"></section>
    </main>
    <footer>2025 (c) Agiloft Inc. All Rights Reserved</footer>
  </body>
</html>
`

const officialLeverBoardHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Agiloft</h1>
    <section>Location type</section>
    <section>Location</section>
    <ul>
      <li>Canada</li>
      <li>United Kingdom</li>
      <li>United States</li>
    </ul>
    <section>Team</section>
    <section>Work type</section>
    <h2>Product</h2>
    <h3>Engineering</h3>
    <a href="https://jobs.lever.co/agiloft/us-platform">Apply</a>
    <a href="https://jobs.lever.co/agiloft/us-platform">Senior Platform Engineer Remote — Full-time United States</a>
    <a href="https://jobs.lever.co/agiloft/ca-platform">Apply</a>
    <a href="https://jobs.lever.co/agiloft/ca-platform">Senior Platform Engineer Remote — Full-time Canada</a>
    <a href="https://jobs.lever.co/agiloft/us-fullstack">Apply</a>
    <a href="https://jobs.lever.co/agiloft/us-fullstack">Sr Software Engineer- Fullstack Remote — Full-time United States</a>
    <h2>Professional Services</h2>
    <h3>Implementation</h3>
    <a href="https://jobs.lever.co/agiloft/uk-architect">Apply</a>
    <a href="https://jobs.lever.co/agiloft/uk-architect">Senior Solution Architect Remote — Full-time United Kingdom</a>
    <h2>Sales</h2>
    <h3>Account Exec</h3>
    <a href="https://jobs.lever.co/agiloft/us-ae-east">Apply</a>
    <a href="https://jobs.lever.co/agiloft/us-ae-east">Enterprise Account Executive – (East) Remote — Full-time United States</a>
    <a href="https://jobs.lever.co/agiloft/us-midmarket">Apply</a>
    <a href="https://jobs.lever.co/agiloft/us-midmarket">Mid-Market Account Executive Remote — Full-time United States</a>
    <h3>Pre-Sales</h3>
    <a href="https://jobs.lever.co/agiloft/uk-consultant">Apply</a>
    <a href="https://jobs.lever.co/agiloft/uk-consultant">Senior Solution Consultant Remote — Full-time United Kingdom</a>
  </body>
</html>
`

const currentLeverBoardHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Agiloft</h1>
    <section>Location type</section>
    <section>Location</section>
    <ul>
      <li>Canada</li>
      <li>United Kingdom</li>
      <li>United States</li>
    </ul>
    <section>Team</section>
    <section>Work type</section>
    <h2>Product</h2>
    <h3>Engineering</h3>
    <a href="https://jobs.lever.co/agiloft/us-platform">Senior Platform Engineer Remote - Full-time United States</a>
    <a href="https://jobs.lever.co/agiloft/us-fullstack">Sr Software Engineer- Fullstack Remote - Full-time United States</a>
    <h2>Sales</h2>
    <a href="https://jobs.lever.co/agiloft/us-ae-east">Enterprise Account Executive Remote - Full-time United States</a>
    <p>Jobs powered by Lever</p>
  </body>
</html>
`

const sampleLeverJobs = [
  {
    id: 'india-solution-architect',
    text: 'Senior Solution Architect',
    hostedUrl: 'https://jobs.lever.co/agiloft/india-solution-architect',
    applyUrl: 'https://jobs.lever.co/agiloft/india-solution-architect/apply',
    createdAt: 1_783_507_200_000,
    categories: {
      location: 'Bengaluru, India',
      team: 'Implementation',
      commitment: 'Full-time',
      allLocations: ['Bengaluru, India'],
    },
    workplaceType: 'remote',
    descriptionPlain: 'Help enterprise customers deploy Agiloft.',
  },
  {
    id: 'us-platform-engineer',
    text: 'Senior Platform Engineer',
    hostedUrl: 'https://jobs.lever.co/agiloft/us-platform-engineer',
    applyUrl: 'https://jobs.lever.co/agiloft/us-platform-engineer/apply',
    createdAt: 1_783_420_800_000,
    categories: {
      location: 'United States',
      team: 'Engineering',
      commitment: 'Full-time',
      allLocations: ['United States'],
    },
    workplaceType: 'remote',
    descriptionPlain: 'Ignore this non-India role.',
  },
]

const liveBoardShapeWithoutIndiaJobs = [
  {
    id: 'us-platform-engineer',
    text: 'Senior Platform Engineer',
    hostedUrl: 'https://jobs.lever.co/agiloft/us-platform-engineer',
    applyUrl: 'https://jobs.lever.co/agiloft/us-platform-engineer/apply',
    createdAt: 1_783_420_800_000,
    categories: {
      location: 'United States',
      team: 'Engineering',
      commitment: 'Full-time',
      allLocations: ['United States'],
    },
    workplaceType: 'remote',
    descriptionPlain: 'Current US role.',
  },
  {
    id: 'uk-solution-consultant',
    text: 'Senior Solution Consultant',
    hostedUrl: 'https://jobs.lever.co/agiloft/uk-solution-consultant',
    applyUrl: 'https://jobs.lever.co/agiloft/uk-solution-consultant/apply',
    createdAt: 1_783_248_000_000,
    categories: {
      location: 'United Kingdom',
      team: 'Pre-Sales',
      commitment: 'Full-time',
      allLocations: ['United Kingdom'],
    },
    workplaceType: 'remote',
    descriptionPlain: 'Current UK role.',
  },
]

const loadAgiloftIndiaModule = async () => {
  try {
    return await import('../../scraper/agiloftindia/script.js')
  } catch {
    assert.fail('Expected Agiloft India scraper module at ../../scraper/agiloftindia/script.js')
  }
}

test('Agiloft India scraper pins the verified official careers page and public Lever board', async () => {
  const agiloftIndia = await loadAgiloftIndiaModule()

  assert.equal(agiloftIndia.SOURCE, 'agiloftindia')
  assert.equal(agiloftIndia.COMPANY, 'Agiloft India')
  assert.equal(agiloftIndia.CAREERS_ENTRY_URL, 'https://www.agiloft.com/careers/')
  assert.equal(agiloftIndia.CAREERS_URL, 'https://www.agiloft.com/careers/')
  assert.deepEqual(agiloftIndia.ACCEPTED_CAREERS_URLS, [
    'https://www.agiloft.com/careers',
    'https://www.agiloft.com/careers/',
    'https://www.agiloft.com/about-us/careers',
    'https://www.agiloft.com/about-us/careers/',
  ])
  assert.equal(agiloftIndia.LEVER_BOARD_URL, 'https://jobs.lever.co/agiloft')
  assert.equal(agiloftIndia.LEVER_API_URL, 'https://api.lever.co/v0/postings/agiloft?mode=json')
  assert.equal(agiloftIndia.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(agiloftIndia.hasOfficialCareersSignal(currentCareersHtmlWithoutLeverHref), true)
  assert.equal(
    agiloftIndia.extractLeverBoardUrl(officialCareersHtml),
    'https://jobs.lever.co/agiloft',
  )
  assert.equal(agiloftIndia.hasOfficialLeverBoardSignal(officialLeverBoardHtml), true)
  assert.equal(agiloftIndia.hasOfficialLeverBoardSignal(currentLeverBoardHtml), true)
})

test('Agiloft India keeps checking the configured Lever board when the current careers shell omits a raw Lever href', async () => {
  const agiloftIndia = await loadAgiloftIndiaModule()
  const requestedPages = []
  const requestedJson = []

  const jobs = await agiloftIndia.createAgiloftIndiaScraper({
    now: () => '2026-07-14T00:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === agiloftIndia.CAREERS_ENTRY_URL) {
        return {
          status: 200,
          url: 'https://www.agiloft.com/careers',
          html: currentCareersHtmlWithoutLeverHref,
        }
      }

      if (url === agiloftIndia.LEVER_BOARD_URL) {
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

      if (url === agiloftIndia.LEVER_API_URL) {
        return liveBoardShapeWithoutIndiaJobs
      }

      throw new Error(`Unexpected json URL: ${url}`)
    },
  })

  assert.deepEqual(requestedPages, [
    agiloftIndia.CAREERS_ENTRY_URL,
    agiloftIndia.LEVER_BOARD_URL,
  ])
  assert.deepEqual(requestedJson, [agiloftIndia.LEVER_API_URL])
  assert.deepEqual(jobs, [])
})

test('Agiloft India extracts only India roles from the Lever postings payload shape', async () => {
  const agiloftIndia = await loadAgiloftIndiaModule()
  const jobs = agiloftIndia.extractLeverJobs(sampleLeverJobs)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior Solution Architect',
    company: 'Agiloft India',
    department: 'Implementation',
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: 'india-solution-architect',
    requisitionId: 'india-solution-architect',
    sourceUrl: 'https://jobs.lever.co/agiloft/india-solution-architect',
    applyUrl: 'https://jobs.lever.co/agiloft/india-solution-architect/apply',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-08T10:40:00.000Z',
    closingDate: null,
    jobDescription: 'Help enterprise customers deploy Agiloft.',
    remoteStatus: 'Remote',
  })
})

test('Agiloft India run returns an honest zero-job result while the verified Lever board exposes no India roles', async () => {
  const agiloftIndia = await loadAgiloftIndiaModule()
  const requestedPages = []
  const requestedJson = []

  const jobs = await agiloftIndia.createAgiloftIndiaScraper({
    now: () => '2026-07-14T00:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === agiloftIndia.CAREERS_ENTRY_URL) {
        return {
          status: 200,
          url: 'https://www.agiloft.com/about-us/careers/',
          html: officialCareersHtml,
        }
      }

      if (url === agiloftIndia.LEVER_BOARD_URL) {
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

      if (url === agiloftIndia.LEVER_API_URL) {
        return liveBoardShapeWithoutIndiaJobs
      }

      throw new Error(`Unexpected json URL: ${url}`)
    },
  })

  assert.deepEqual(requestedPages, [
    agiloftIndia.CAREERS_ENTRY_URL,
    agiloftIndia.LEVER_BOARD_URL,
  ])
  assert.deepEqual(requestedJson, [agiloftIndia.LEVER_API_URL])
  assert.deepEqual(jobs, [])
})

test('Agiloft India fails closed when the verified careers surface or Lever board changes materially', async () => {
  const agiloftIndia = await loadAgiloftIndiaModule()

  await assert.rejects(
    agiloftIndia.createAgiloftIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === agiloftIndia.CAREERS_ENTRY_URL) {
          return {
            status: 200,
            url: agiloftIndia.CAREERS_URL,
            html: '<html><body><h1>Join Agiloft</h1></body></html>',
          }
        }

        throw new Error(`Unexpected page URL: ${url}`)
      },
      fetchJson: async () => liveBoardShapeWithoutIndiaJobs,
    }),
    /verified official careers surface/i,
  )

  await assert.rejects(
    agiloftIndia.createAgiloftIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === agiloftIndia.CAREERS_ENTRY_URL) {
          return {
            status: 200,
            url: 'https://www.agiloft.com/about-us/careers/',
            html: officialCareersHtml,
          }
        }

        if (url === agiloftIndia.LEVER_BOARD_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Board changed</h1></body></html>',
          }
        }

        throw new Error(`Unexpected page URL: ${url}`)
      },
      fetchJson: async () => liveBoardShapeWithoutIndiaJobs,
    }),
    /verified public lever board/i,
  )
})
