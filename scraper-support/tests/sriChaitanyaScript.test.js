import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T11:30:00.000Z'

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Sri Chaitanya</title>
    <link rel="canonical" href="https://srichaitanya.net/careers/" />
  </head>
  <body>
    <main>
      <h1>Make Careers at Sri Chaitanya</h1>
      <h2>Careers</h2>

      <article class="career-card">
        <h3>Sr. Faculty for NEET - Sri Chaitanya</h3>
        <p>Sri Chaitanya Vijayawada Industry Standard</p>
        <a href="https://srichaitanya.net/career/sr-faculty-for-neet/">View Details</a>
      </article>

      <article class="career-card">
        <h3>Sr. Faculty for IITJEE - Sri Chaitanya</h3>
        <p>Sri Chaitanya Hyderabad Industry Standard</p>
        <a href="https://srichaitanya.net/career/sr-faculty-for-iitjee/">View Details</a>
      </article>
    </main>
  </body>
</html>
`

const neetDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Sr. Faculty for NEET - Sri Chaitanya</title>
  </head>
  <body>
    <main>
      <h1>Sr. Faculty for NEET - Sri Chaitanya</h1>
      <p>Role Summary:</p>
      <p>Drive NEET academic planning and classroom delivery for senior batches.</p>
      <p>Responsibilities:</p>
      <ul>
        <li>Mentor junior faculty members and support student performance reviews.</li>
      </ul>
      <p>Employment Type: Full Time</p>
      <p>Date Posted: July 17, 2026</p>
      <p>Location: Vijayawada</p>
      <p>Experience: 10 Years or More</p>
      <p>Qualification: M.Sc / Ph.D / Relevant Masters Degree</p>
      <h2>Apply For Job</h2>
      <form>
        <input name="name" />
      </form>
    </main>
  </body>
</html>
`

const iitjeeDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Sr. Faculty for IITJEE - Sri Chaitanya</title>
  </head>
  <body>
    <main>
      <h1>Sr. Faculty for IITJEE - Sri Chaitanya</h1>
      <p>Role Summary:</p>
      <p>Lead IITJEE curriculum planning, concept sessions, and competitive assessments.</p>
      <p>Responsibilities:</p>
      <ul>
        <li>Coordinate with academic leaders on batch readiness and exam strategy.</li>
      </ul>
      <p>Employment Type: Full Time</p>
      <p>Date Posted: July 17, 2026</p>
      <p>Location: Hyderabad</p>
      <p>Experience: 10 Years or More</p>
      <p>Qualification: M.Tech / Ph.D / Relevant Masters Degree</p>
      <h2>Apply For Job</h2>
      <form>
        <input name="name" />
      </form>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/srichaitanya/script.js')
  } catch {
    assert.fail('Expected Sri Chaitanya scraper module at ../../scraper/srichaitanya/script.js')
  }
}

test('Sri Chaitanya helpers stay pinned to the verified first-party careers contract from Friday, July 17, 2026', async () => {
  const sriChaitanya = await loadModule()

  assert.equal(sriChaitanya.SOURCE, 'srichaitanya')
  assert.equal(sriChaitanya.COMPANY, 'Sri Chaitanya')
  assert.equal(sriChaitanya.HOMEPAGE_URL, 'https://srichaitanya.net/')
  assert.equal(sriChaitanya.CAREERS_URL, 'https://srichaitanya.net/careers/')
  assert.deepEqual(sriChaitanya.DETAIL_PAGE_URLS, [
    'https://srichaitanya.net/career/sr-faculty-for-neet/',
    'https://srichaitanya.net/career/sr-faculty-for-iitjee/',
  ])
  assert.equal(sriChaitanya.VERIFIED_ON, '2026-07-17')
  assert.match(sriChaitanya.VERIFIED_SURFACE_SUMMARY, /Sri Chaitanya/i)
  assert.equal(sriChaitanya.hasOfficialCareersSignal(careersPageHtml), true)
  assert.equal(sriChaitanya.hasOfficialJobDetailSignal(neetDetailHtml), true)
  assert.deepEqual(sriChaitanya.extractCareerCards(careersPageHtml), [
    {
      title: 'Sr. Faculty for NEET - Sri Chaitanya',
      listingSummary: 'Sri Chaitanya Vijayawada Industry Standard',
      detailUrl: 'https://srichaitanya.net/career/sr-faculty-for-neet/',
    },
    {
      title: 'Sr. Faculty for IITJEE - Sri Chaitanya',
      listingSummary: 'Sri Chaitanya Hyderabad Industry Standard',
      detailUrl: 'https://srichaitanya.net/career/sr-faculty-for-iitjee/',
    },
  ])

  assert.deepEqual(
    sriChaitanya.extractJobFromDetailHtml(
      neetDetailHtml,
      {
        title: 'Sr. Faculty for NEET - Sri Chaitanya',
        detailUrl: 'https://srichaitanya.net/career/sr-faculty-for-neet/',
      },
      { scrapedAt: FIXED_SCRAPED_AT },
    ),
    {
      title: 'Sr. Faculty for NEET - Sri Chaitanya',
      company: 'Sri Chaitanya',
      department: null,
      location: 'Vijayawada, India',
      city: 'Vijayawada',
      country: 'India',
      jobId: 'sr-faculty-for-neet',
      requisitionId: 'sr-faculty-for-neet',
      sourceUrl: 'https://srichaitanya.net/career/sr-faculty-for-neet/',
      applyUrl: 'https://srichaitanya.net/career/sr-faculty-for-neet/',
      employmentType: 'Full Time',
      experienceRequired: '10 Years or More',
      minimumQualification: 'M.Sc / Ph.D / Relevant Masters Degree',
      preferredQualification: null,
      requiredSkills: [],
      postingDate: 'July 17, 2026',
      closingDate: null,
      jobDescription:
        'Drive NEET academic planning and classroom delivery for senior batches. Mentor junior faculty members and support student performance reviews.',
      remoteStatus: 'On-site',
      source: 'srichaitanya',
      link: 'https://srichaitanya.net/career/sr-faculty-for-neet/',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  )
})

test('Sri Chaitanya run validates the official careers page, follows same-domain detail links, and returns normalized jobs', async () => {
  const sriChaitanya = await loadModule()
  const requestedUrls = []

  const jobs = await sriChaitanya.createSriChaitanyaScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === sriChaitanya.CAREERS_URL) return careersPageHtml
      if (url === 'https://srichaitanya.net/career/sr-faculty-for-neet/') return neetDetailHtml
      if (url === 'https://srichaitanya.net/career/sr-faculty-for-iitjee/') return iitjeeDetailHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    sriChaitanya.CAREERS_URL,
    'https://srichaitanya.net/career/sr-faculty-for-neet/',
    'https://srichaitanya.net/career/sr-faculty-for-iitjee/',
  ])
  assert.deepEqual(jobs, [
    {
      title: 'Sr. Faculty for NEET - Sri Chaitanya',
      company: 'Sri Chaitanya',
      department: null,
      location: 'Vijayawada, India',
      city: 'Vijayawada',
      country: 'India',
      jobId: 'sr-faculty-for-neet',
      requisitionId: 'sr-faculty-for-neet',
      sourceUrl: 'https://srichaitanya.net/career/sr-faculty-for-neet/',
      applyUrl: 'https://srichaitanya.net/career/sr-faculty-for-neet/',
      employmentType: 'Full Time',
      experienceRequired: '10 Years or More',
      minimumQualification: 'M.Sc / Ph.D / Relevant Masters Degree',
      preferredQualification: null,
      requiredSkills: [],
      postingDate: 'July 17, 2026',
      closingDate: null,
      jobDescription:
        'Drive NEET academic planning and classroom delivery for senior batches. Mentor junior faculty members and support student performance reviews.',
      remoteStatus: 'On-site',
      source: 'srichaitanya',
      link: 'https://srichaitanya.net/career/sr-faculty-for-neet/',
      scrapedAt: FIXED_SCRAPED_AT,
      companyCareerPage: 'https://srichaitanya.net/careers/',
      companyDomain: 'srichaitanya.net',
      atsPlatform: 'official-company-careers',
    },
    {
      title: 'Sr. Faculty for IITJEE - Sri Chaitanya',
      company: 'Sri Chaitanya',
      department: null,
      location: 'Hyderabad, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'sr-faculty-for-iitjee',
      requisitionId: 'sr-faculty-for-iitjee',
      sourceUrl: 'https://srichaitanya.net/career/sr-faculty-for-iitjee/',
      applyUrl: 'https://srichaitanya.net/career/sr-faculty-for-iitjee/',
      employmentType: 'Full Time',
      experienceRequired: '10 Years or More',
      minimumQualification: 'M.Tech / Ph.D / Relevant Masters Degree',
      preferredQualification: null,
      requiredSkills: [],
      postingDate: 'July 17, 2026',
      closingDate: null,
      jobDescription:
        'Lead IITJEE curriculum planning, concept sessions, and competitive assessments. Coordinate with academic leaders on batch readiness and exam strategy.',
      remoteStatus: 'On-site',
      source: 'srichaitanya',
      link: 'https://srichaitanya.net/career/sr-faculty-for-iitjee/',
      scrapedAt: FIXED_SCRAPED_AT,
      companyCareerPage: 'https://srichaitanya.net/careers/',
      companyDomain: 'srichaitanya.net',
      atsPlatform: 'official-company-careers',
    },
  ])
})

test('Sri Chaitanya fails closed when the verified careers page or detail pages drift materially', async () => {
  const sriChaitanya = await loadModule()

  await assert.rejects(
    sriChaitanya.createSriChaitanyaScraper().run({
      fetchText: async (url) => {
        if (url === sriChaitanya.CAREERS_URL) return '<html><body><h1>Careers</h1></body></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified Sri Chaitanya careers page/i,
  )

  await assert.rejects(
    sriChaitanya.createSriChaitanyaScraper().run({
      fetchText: async (url) => {
        if (url === sriChaitanya.CAREERS_URL) {
          return `
            <!doctype html>
            <html>
              <head>
                <title>Careers - Sri Chaitanya</title>
                <link rel="canonical" href="https://srichaitanya.net/careers/" />
              </head>
              <body>
                <h1>Make Careers at Sri Chaitanya</h1>
                <h2>Careers</h2>
                <article>
                  <h3>Sr. Faculty for NEET - Sri Chaitanya</h3>
                  <p>Sri Chaitanya Vijayawada Industry Standard</p>
                </article>
                <article>
                  <h3>Sr. Faculty for IITJEE - Sri Chaitanya</h3>
                  <p>Sri Chaitanya Hyderabad Industry Standard</p>
                </article>
              </body>
            </html>
          `
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /same-domain detail links/i,
  )

  await assert.rejects(
    sriChaitanya.createSriChaitanyaScraper().run({
      fetchText: async (url) => {
        if (url === sriChaitanya.CAREERS_URL) return careersPageHtml
        if (url === 'https://srichaitanya.net/career/sr-faculty-for-neet/') {
          return '<html><body><h1>Unexpected</h1></body></html>'
        }
        if (url === 'https://srichaitanya.net/career/sr-faculty-for-iitjee/') return iitjeeDetailHtml

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified Sri Chaitanya job detail page/i,
  )
})
