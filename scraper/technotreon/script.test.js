import assert from 'node:assert/strict'
import test from 'node:test'

import { readInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

const homepageHtml = `
<!doctype html>
<html>
  <head>
    <title>Technotreon: The Innovation Company</title>
  </head>
  <body>
    <nav>
      <a href="/">HOME</a>
      <a href="/careers">CAREERS</a>
    </nav>
    <h1>TECHNOTREON: THE INNOVATION COMPANY</h1>
    <p>We invent, patent, and commercialize breakthrough technologies.</p>
    <p>At Technotreon, we invent the next big thing, driving innovation for a Viksit Bharat.</p>
    <footer>research[at]technotreon[dot]in</footer>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html>
  <head>
    <title>CAREERS</title>
  </head>
  <body>
    <nav>
      <a href="/">HOME</a>
      <a href="/careers">CAREERS</a>
    </nav>
    <h1>Although we aren't sailing for the Antarctic (yet), our job description remains the same as Ernest Shackleton's.</h1>
    <p>Open call for all humans who are not machines, who come with a spirit to learn and grow, and those with an innate ability to innovate.</p>
    <h2>DEPARTMENTS AT TECHNOTREON</h2>

    <h2>Business and Marketing Standardised Aptitude Test</h2>
    <p>Join our dynamic team as a Business Rockstar! Drive brand awareness, execute innovative campaigns, analyze market trends, and unleash your creativity to captivate audiences. Collaborate with cross-functional teams to drive transformative ideas and shape our future. #BrandInnovator</p>
    <a href="https://forms.gle/business-role">Apply</a>

    <h2>Intellectual Property (Legal) STANDARDISED Aptitude Test</h2>
    <p>Step into the world of intellectual property and legal innovation. You will work on patents, legal research, and IP strategy to protect and strengthen cutting-edge ideas.</p>
    <p>Gain hands-on experience in real-world legal challenges, contributing to innovation, compliance, and strategic decision-making.</p>
    <a href="https://forms.gle/legal-role">Apply</a>

    <h2>Engineering STANDARDISED Aptitude Test</h2>
    <p>Immerse yourself in cutting-edge innovation research and discover new horizons. We're seeking passionate individuals to pioneer electronic design innovation. Work alongside diverse teams to catalyze groundbreaking ideas and mould our future. Be part of the driving force behind the next major breakthrough!</p>
    <a href="https://forms.gle/engineering-role">Apply</a>

    <h2>HR Assistant STANDARDISED Aptitude Test</h2>
    <p>Step into people management and organizational growth. As an HR Assistant, you will support recruitment, employee engagement, and HR operations while contributing to a positive workplace culture.</p>
    <p>Work with dynamic teams and gain hands-on experience in HR processes, helping drive organizational success.</p>
    <a href="https://forms.gle/hr-role">Apply</a>

    <section>
      <h2>The Only Room Where Inventors, Engineers & IP Lawyers Build</h2>
      <p>Most companies hire you to maintain someone else's old code or product. At Technotreon, we build things from scratch that have never existed before.</p>
    </section>
  </body>
</html>
`

const loadTechnotreonModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Technotreon scraper module at ./script.js')
  }
}

test('Technotreon scraper constants stay pinned to the verified first-party surface', async () => {
  const technotreon = await loadTechnotreonModule()

  assert.equal(technotreon.SOURCE, 'technotreon')
  assert.equal(technotreon.COMPANY, 'Technotreon')
  assert.equal(technotreon.HOMEPAGE_URL, 'https://technotreon.in/')
  assert.equal(technotreon.CAREERS_URL, 'https://technotreon.in/careers')
  assert.equal(technotreon.COMPANY_DOMAIN, 'technotreon.in')
  assert.equal(technotreon.ATS_PLATFORM, 'official-company-careers')
  assert.equal(technotreon.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(technotreon.hasOfficialCareersSignal(careersHtml), true)
})

test('extractListings returns the public openings exposed on the first-party careers page', async () => {
  const technotreon = await loadTechnotreonModule()

  assert.deepEqual(technotreon.extractListings(careersHtml), [
    {
      title: 'Business and Marketing Standardised Aptitude Test',
      applyUrl: 'https://forms.gle/business-role',
      department: 'Business and Marketing',
      description:
        'Join our dynamic team as a Business Rockstar! Drive brand awareness, execute innovative campaigns, analyze market trends, and unleash your creativity to captivate audiences. Collaborate with cross-functional teams to drive transformative ideas and shape our future. #BrandInnovator',
      location: 'India',
    },
    {
      title: 'Intellectual Property (Legal) STANDARDISED Aptitude Test',
      applyUrl: 'https://forms.gle/legal-role',
      department: 'Intellectual Property (Legal)',
      description:
        'Step into the world of intellectual property and legal innovation. You will work on patents, legal research, and IP strategy to protect and strengthen cutting-edge ideas. Gain hands-on experience in real-world legal challenges, contributing to innovation, compliance, and strategic decision-making.',
      location: 'India',
    },
    {
      title: 'Engineering STANDARDISED Aptitude Test',
      applyUrl: 'https://forms.gle/engineering-role',
      department: 'Engineering',
      description:
        "Immerse yourself in cutting-edge innovation research and discover new horizons. We're seeking passionate individuals to pioneer electronic design innovation. Work alongside diverse teams to catalyze groundbreaking ideas and mould our future. Be part of the driving force behind the next major breakthrough!",
      location: 'India',
    },
    {
      title: 'HR Assistant STANDARDISED Aptitude Test',
      applyUrl: 'https://forms.gle/hr-role',
      department: 'HR Assistant',
      description:
        'Step into people management and organizational growth. As an HR Assistant, you will support recruitment, employee engagement, and HR operations while contributing to a positive workplace culture. Work with dynamic teams and gain hands-on experience in HR processes, helping drive organizational success.',
      location: 'India',
    },
  ])
})

test('run fetches the verified first-party pages and decorates Technotreon jobs for persistence', async () => {
  const technotreon = await loadTechnotreonModule()
  const requestedUrls = []

  const jobs = await technotreon.createTechnotreonScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === technotreon.HOMEPAGE_URL) return homepageHtml
      if (url === technotreon.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    technotreon.HOMEPAGE_URL,
    technotreon.CAREERS_URL,
  ])
  assert.equal(jobs.length, 4)
  assert.deepEqual(jobs[0], {
    title: 'Business and Marketing Standardised Aptitude Test',
    company: 'Technotreon',
    location: 'India',
    city: null,
    country: 'India',
    source: 'technotreon',
    sourceUrl: 'https://technotreon.in/careers',
    applyUrl: 'https://forms.gle/business-role',
    link: 'https://forms.gle/business-role',
    companyCareerPage: 'https://technotreon.in/careers',
    companyDomain: 'technotreon.in',
    atsPlatform: 'official-company-careers',
    jobId: 'technotreon-business-and-marketing-standardised-aptitude-test',
    requisitionId: 'technotreon-business-and-marketing-standardised-aptitude-test',
    department: 'Business and Marketing',
    employmentType: null,
    remoteStatus: null,
    experienceRequired: null,
    jobDescription:
      'Join our dynamic team as a Business Rockstar! Drive brand awareness, execute innovative campaigns, analyze market trends, and unleash your creativity to captivate audiences. Collaborate with cross-functional teams to drive transformative ideas and shape our future. #BrandInnovator',
    requiredSkills: [],
    preferredQualification: null,
    minimumQualification: null,
    closingDate: null,
    postingDate: null,
    scrapedAt: jobs[0].scrapedAt,
  })
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
})

test('run fails closed when the verified first-party careers surface changes', async () => {
  const technotreon = await loadTechnotreonModule()

  await assert.rejects(
    technotreon.createTechnotreonScraper().run({
      fetchText: async (url) => {
        if (url === technotreon.HOMEPAGE_URL) return '<html><title>Unexpected</title></html>'
        return careersHtml
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    technotreon.createTechnotreonScraper().run({
      fetchText: async (url) => {
        if (url === technotreon.HOMEPAGE_URL) return homepageHtml
        return careersHtml.replace('DEPARTMENTS AT TECHNOTREON', 'JOIN US')
      },
    }),
    /verified official careers page/i,
  )

  await assert.rejects(
    technotreon.createTechnotreonScraper().run({
      fetchText: async (url) => {
        if (url === technotreon.HOMEPAGE_URL) return homepageHtml
        return careersHtml.replace(/<a href="https:\/\/forms\.gle\/[^"]+">Apply<\/a>/g, '')
      },
    }),
    /verified official careers page/i,
  )
})

test('run returns jobs when the homepage transport fails but the verified careers page remains reachable', async () => {
  const technotreon = await loadTechnotreonModule()

  const jobs = await technotreon.createTechnotreonScraper().run({
    fetchText: async (url) => {
      if (url === technotreon.HOMEPAGE_URL) {
        const error = new TypeError('fetch failed')
        error.cause = {
          code: 'ENOTFOUND',
          message: 'getaddrinfo ENOTFOUND technotreon.in',
        }
        throw error
      }

      return careersHtml
    },
    now: () => '2026-08-05T00:00:00.000Z',
  })

  assert.equal(jobs.length, 4)
  assert.equal(jobs[0].scrapedAt, '2026-08-05T00:00:00.000Z')
})

test('run returns discovery-only evidence when the Technotreon careers surface times out in the current runtime', async () => {
  const technotreon = await loadTechnotreonModule()
  const error = new TypeError('fetch failed')
  error.cause = { code: 'UND_ERR_CONNECT_TIMEOUT', message: 'Connect Timeout Error' }

  const jobs = await technotreon.createTechnotreonScraper().run({
    fetchText: async () => { throw error },
    now: () => '2026-09-14T00:00:00.000Z',
  })

  assert.deepEqual(jobs, [])
  const evidence = readInventoryEvidence(jobs)
  assert.equal(evidence?.status, 'discovery-only')
  assert.equal(evidence?.surface, technotreon.CAREERS_URL)
  assert.equal(evidence?.listingComplete, false)
})
