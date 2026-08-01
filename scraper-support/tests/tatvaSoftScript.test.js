import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>TatvaSoft Career and Culture</title>
  </head>
  <body>
    <h1>Technology evolves, Challenges grow</h1>
    <p>Please note, we do not charge any fees or recruit through third-party agents. All official communication is sent only through email IDs ending with @tatvasoft.com.</p>
    <p>At TatvaSoft, we care for our employees and our customers, they are our most important assets.</p>
    <h2>Jobs at TatvaSoft</h2>
    <article>
      <h3>Business Development Executive</h3>
      <p>Position: BDE/BDM</p>
      <p>Experience: 1+ years</p>
      <a href="https://www.tatvasoft.com/career/business-development-executive">Read More</a>
      <span>Apply now</span>
    </article>
    <article>
      <h3>Java Developer</h3>
      <p>Position: ASE/SE/SSE/TL</p>
      <p>Experience: 2 - 5 years</p>
      <a href="https://www.tatvasoft.com/career/java-developer">Read More</a>
      <span>Apply now</span>
    </article>
    <h2>Benefits of working with TatvaSoft:</h2>
    <p>Find the open positions listed below and apply via email on career@tatvasoft.com</p>
  </body>
</html>
`

const BUSINESS_DEVELOPMENT_DETAIL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Business Development Executive | TatvaSoft Career and Culture</title>
  </head>
  <body>
    <h1>Business Development Executive</h1>
    <p>We at TatvaSoft help our clients by providing innovative software services in the latest technologies.</p>
    <p>Qualification: MBA/BE/MCA/M.E</p>
    <p>Required Experience: 1-6 Years</p>
    <h3>Responsibilities</h3>
    <ul>
      <li>Understanding client’s nature of business, organization, products and domain.</li>
      <li>Passionate about the Sales in the assigned territory and achieving targets.</li>
    </ul>
    <p>To apply for this position mail your updated Resume on career@tatvasoft.com</p>
  </body>
</html>
`

const JAVA_DEVELOPER_DETAIL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Java Developer | TatvaSoft Career and Culture</title>
  </head>
  <body>
    <h1>Java Developer</h1>
    <p>We at TatvaSoft help our clients by providing innovative software services in the latest technologies.</p>
    <p>Qualification: B.Tech/B.E/MCA/M.Sc/M.E</p>
    <h3>Required Specifications and Qualifications</h3>
    <ul>
      <li>Strong experience with Java 8+.</li>
      <li>Hands-on expertise in Spring Boot and REST API design.</li>
      <li>Required experience – 2-5 yrs</li>
    </ul>
    <h3>Roles and responsibilities</h3>
    <ul>
      <li>Design and develop scalable backend services.</li>
      <li>Build and maintain RESTful APIs.</li>
    </ul>
    <p>To apply for this position mail your updated Resume on career@tatvasoft.com</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/tatvasoft/script.js')
  } catch {
    assert.fail('Expected TatvaSoft scraper module at ../../scraper/tatvasoft/script.js')
  }
}

test('TatvaSoft helpers stay pinned to the verified first-party career page and role detail pages', async () => {
  const tatvasoft = await loadModule()

  assert.equal(tatvasoft.SOURCE, 'tatvasoft')
  assert.equal(tatvasoft.COMPANY, 'TatvaSoft')
  assert.equal(tatvasoft.OFFICIAL_BRAND_NAME, 'TatvaSoft')
  assert.equal(tatvasoft.VERIFIED_ON, '2026-07-17')
  assert.equal(tatvasoft.CAREERS_URL, 'https://www.tatvasoft.com/career')
  assert.equal(tatvasoft.APPLICATION_EMAIL, 'career@tatvasoft.com')
  assert.equal(tatvasoft.APPLICATION_URL, 'mailto:career@tatvasoft.com')
  assert.equal(tatvasoft.hasOfficialCareersPageSignal(CAREERS_HTML), true)
  assert.deepEqual(tatvasoft.extractOpeningLinks(CAREERS_HTML), [
    {
      title: 'Business Development Executive',
      url: 'https://www.tatvasoft.com/career/business-development-executive',
    },
    {
      title: 'Java Developer',
      url: 'https://www.tatvasoft.com/career/java-developer',
    },
  ])
  assert.equal(tatvasoft.extractApplicationEmail(BUSINESS_DEVELOPMENT_DETAIL_HTML), 'career@tatvasoft.com')
  assert.equal(tatvasoft.hasOfficialDetailSignal(BUSINESS_DEVELOPMENT_DETAIL_HTML), true)

  const job = tatvasoft.extractJobFromDetailPage(BUSINESS_DEVELOPMENT_DETAIL_HTML, {
    title: 'Business Development Executive',
    url: 'https://www.tatvasoft.com/career/business-development-executive',
    scrapedAt: FIXED_SCRAPED_AT,
  })

  assert.equal(job.jobId, 'tatvasoft-business-development-executive')
  assert.equal(job.requisitionId, 'business-development-executive')
  assert.equal(job.title, 'Business Development Executive')
  assert.equal(job.company, 'TatvaSoft')
  assert.equal(job.department, 'Business Development')
  assert.equal(job.location, 'India')
  assert.equal(job.city, null)
  assert.equal(job.country, 'India')
  assert.equal(job.sourceUrl, 'https://www.tatvasoft.com/career/business-development-executive')
  assert.equal(job.applyUrl, 'mailto:career@tatvasoft.com')
  assert.equal(job.link, 'mailto:career@tatvasoft.com')
  assert.equal(job.experienceRequired, '1-6 Years')
  assert.equal(job.minimumQualification, 'MBA/BE/MCA/M.E')
  assert.match(job.jobDescription, /innovative software services/i)
  assert.match(job.jobDescription, /Understanding client’s nature of business/i)
})

test('TatvaSoft run verifies the official career page and enriches first-party role details', async () => {
  const tatvasoft = await loadModule()
  const requestedUrls = []

  const jobs = await tatvasoft.createTatvaSoftScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === tatvasoft.CAREERS_URL) {
        return { status: 200, url, html: CAREERS_HTML }
      }

      if (url === 'https://www.tatvasoft.com/career/business-development-executive') {
        return { status: 200, url, html: BUSINESS_DEVELOPMENT_DETAIL_HTML }
      }

      if (url === 'https://www.tatvasoft.com/career/java-developer') {
        return { status: 200, url, html: JAVA_DEVELOPER_DETAIL_HTML }
      }

      throw new Error(`Unexpected TatvaSoft URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    tatvasoft.CAREERS_URL,
    'https://www.tatvasoft.com/career/business-development-executive',
    'https://www.tatvasoft.com/career/java-developer',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'tatvasoft')
  assert.equal(jobs[0].link, 'mailto:career@tatvasoft.com')
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
  assert.equal(jobs[1].title, 'Java Developer')
  assert.equal(jobs[1].requisitionId, 'java-developer')
  assert.equal(jobs[1].minimumQualification, 'B.Tech/B.E/MCA/M.Sc/M.E')
})

test('TatvaSoft fails closed when the verified career page or role detail contract drifts', async () => {
  const tatvasoft = await loadModule()

  await assert.rejects(
    tatvasoft.createTatvaSoftScraper().run({
      fetchPage: async (url) => {
        if (url === tatvasoft.CAREERS_URL) {
          return { status: 200, url, html: CAREERS_HTML.replace('Jobs at TatvaSoft', 'Open Roles') }
        }

        return { status: 200, url, html: BUSINESS_DEVELOPMENT_DETAIL_HTML }
      },
    }),
    /verified first-party career page/i,
  )

  await assert.rejects(
    tatvasoft.createTatvaSoftScraper().run({
      fetchPage: async (url) => {
        if (url === tatvasoft.CAREERS_URL) {
          return { status: 200, url, html: CAREERS_HTML }
        }

        return {
          status: 200,
          url,
          html: BUSINESS_DEVELOPMENT_DETAIL_HTML.replace('career@tatvasoft.com', 'jobs@example.com'),
        }
      },
    }),
    /verified first-party role detail page/i,
  )
})
