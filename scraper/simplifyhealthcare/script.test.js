import assert from 'node:assert/strict'
import test from 'node:test'

const loadSimplifyHealthcareModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const currentOpeningsHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Current Openings | Simplify Healthcare</title>
    <link rel="canonical" href="https://simplifyhealthcare.com/careers/current-openings/">
  </head>
  <body>
    <main>
      <h1>New Thinking. New Opportunities.</h1>
      <p>Simplify Healthcare is always looking to expand our team with versatile professionals. Become a part of the Simplify team today.</p>
      <p>Flexi Hybrid work model</p>

      <article>
        <h2>Project Manager</h2>
        <p>Jun 22, 2026</p>
        <a href="https://simplifyhealthcare.com/careers/current-openings/india/project-manager-2/">Apply Now</a>
      </article>

      <article>
        <h2>Product Manager</h2>
        <p>Jun 12, 2026</p>
        <a href="/careers/current-openings/india/product-manager/">Apply Now</a>
      </article>

      <article>
        <h2>Product Manager, Provider</h2>
        <p>Jun 12, 2026</p>
        <a href="/careers/current-openings/aurora-u-s/product-manager-provider1/">Apply Now</a>
      </article>
    </main>
  </body>
</html>
`

const indiaArchiveHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Current Openings | Simplify Healthcare</title>
    <link rel="canonical" href="https://simplifyhealthcare.com/careers/current-openings/">
  </head>
  <body>
    <main>
      <h1>Current Openings</h1>
      <p>New Thinking. New Opportunities.</p>

      <article>
        <h2>Product Marketing Lead</h2>
        <p>Apr 10, 2026</p>
        <a href="https://simplifyhealthcare.com/careers/current-openings/india/product-marketing-lead/">Apply Now</a>
      </article>

      <article>
        <h2>Project Manager</h2>
        <p>Jun 22, 2026</p>
        <a href="https://simplifyhealthcare.com/careers/current-openings/india/project-manager-2/">Apply Now</a>
      </article>
    </main>
  </body>
</html>
`

const projectManagerHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Project Manager | Simplify Healthcare</title>
    <link rel="canonical" href="https://simplifyhealthcare.com/careers/current-openings/india/project-manager-2/">
  </head>
  <body>
    <main>
      <nav>Home Careers Current Openings India</nav>
      <h1>Project Manager</h1>
      <p>Jun 22, 2026 Pune, India</p>
      <h2>About Simplify Healthcare</h2>
      <p>Simplify Healthcare is one of the fastest growing healthcare technology solutions providers to the payer market.</p>
      <h2>Role Overview</h2>
      <p>Lead cross-functional delivery for payer platform initiatives.</p>
      <h2>Ideal Candidate Profile</h2>
      <p>8-12 years of experience leading enterprise software programs.</p>
      <p>Based in Pune with hybrid work culture.</p>
      <p>If you have any questions, please direct your inquiries to careers@simplifyhealthcare.com.</p>

      <section>
        <h3>Related Posts</h3>
        <a href="https://simplifyhealthcare.com/careers/current-openings/india/product-marketing-lead/">Product Marketing Lead</a>
      </section>
    </main>
  </body>
</html>
`

const productManagerHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Product Manager | Simplify Healthcare</title>
    <link rel="canonical" href="https://simplifyhealthcare.com/careers/current-openings/india/product-manager/">
  </head>
  <body>
    <main>
      <h1>Product Manager</h1>
      <p>Jun 12, 2026 Pune, India</p>
      <h2>About Simplify Healthcare</h2>
      <p>Simplify Healthcare builds SaaS products for health plans.</p>
      <h2>Role Overview</h2>
      <p>Drive product strategy across provider and member experiences.</p>
      <p>5-8 years of product management experience.</p>
      <p>If you have any questions, please direct your inquiries to careers@simplifyhealthcare.com.</p>
    </main>
  </body>
</html>
`

const productMarketingLeadHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Product Marketing Lead | Simplify Healthcare</title>
    <link rel="canonical" href="https://simplifyhealthcare.com/careers/current-openings/india/product-marketing-lead/">
  </head>
  <body>
    <main>
      <h1>Product Marketing Lead</h1>
      <p>Apr 10, 2026 Pune, India</p>
      <h2>About Simplify Healthcare</h2>
      <p>Join our healthcare product marketing team.</p>
      <h2>Role Overview</h2>
      <p>Shape go-to-market strategy for payer-facing products.</p>
      <p>Remote-first flexibility with periodic Pune collaboration.</p>
      <p>If you have any questions, please direct your inquiries to careers@simplifyhealthcare.com.</p>
    </main>
  </body>
</html>
`

test('Simplify Healthcare validates the verified official careers surfaces and extracts India detail URLs', async () => {
  const simplifyHealthcare = await loadSimplifyHealthcareModule()
  assert.ok(simplifyHealthcare, 'Expected Simplify Healthcare scraper module at ./script.js')

  assert.equal(simplifyHealthcare.SOURCE, 'simplifyhealthcare')
  assert.equal(simplifyHealthcare.COMPANY, 'Simplify Healthcare')
  assert.equal(simplifyHealthcare.CAREERS_URL, 'https://simplifyhealthcare.com/careers/current-openings/')
  assert.equal(
    simplifyHealthcare.INDIA_ARCHIVE_URL,
    'https://simplifyhealthcare.com/category/careers/current-openings/india/',
  )
  assert.equal(simplifyHealthcare.hasOfficialCareersSignal(currentOpeningsHtml), true)
  assert.equal(simplifyHealthcare.hasOfficialCareersSignal(indiaArchiveHtml), true)

  assert.deepEqual(simplifyHealthcare.extractIndiaDetailUrls(currentOpeningsHtml), [
    'https://simplifyhealthcare.com/careers/current-openings/india/project-manager-2/',
    'https://simplifyhealthcare.com/careers/current-openings/india/product-manager/',
  ])

  assert.deepEqual(simplifyHealthcare.extractIndiaDetailUrls(indiaArchiveHtml), [
    'https://simplifyhealthcare.com/careers/current-openings/india/product-marketing-lead/',
    'https://simplifyhealthcare.com/careers/current-openings/india/project-manager-2/',
  ])
})

test('Simplify Healthcare extracts India jobs from official current-opening detail pages', async () => {
  const simplifyHealthcare = await loadSimplifyHealthcareModule()
  assert.ok(simplifyHealthcare, 'Expected Simplify Healthcare scraper module at ./script.js')

  assert.deepEqual(
    simplifyHealthcare.extractJobFromDetailHtml({
      url: 'https://simplifyhealthcare.com/careers/current-openings/india/project-manager-2/',
      html: projectManagerHtml,
    }),
    {
      jobId: 'simplifyhealthcare-project-manager-2',
      requisitionId: 'simplifyhealthcare-project-manager-2',
      title: 'Project Manager',
      company: 'Simplify Healthcare',
      department: null,
      location: 'Pune, India',
      city: 'Pune',
      country: 'India',
      sourceUrl: 'https://simplifyhealthcare.com/careers/current-openings/india/project-manager-2/',
      applyUrl: 'https://simplifyhealthcare.com/careers/current-openings/india/project-manager-2/',
      employmentType: null,
      experienceRequired: '8-12 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-06-22',
      closingDate: null,
      jobDescription: 'About Simplify Healthcare Simplify Healthcare is one of the fastest growing healthcare technology solutions providers to the payer market. Role Overview Lead cross-functional delivery for payer platform initiatives. Ideal Candidate Profile 8-12 years of experience leading enterprise software programs. Based in Pune with hybrid work culture.',
      remoteStatus: 'Hybrid',
    },
  )
})

test('Simplify Healthcare run fetches both verified official listing surfaces, crawls same-domain India detail pages, and decorates jobs', async () => {
  const simplifyHealthcare = await loadSimplifyHealthcareModule()
  assert.ok(simplifyHealthcare, 'Expected Simplify Healthcare scraper module at ./script.js')

  const pagesByUrl = new Map([
    [simplifyHealthcare.CAREERS_URL, currentOpeningsHtml],
    [simplifyHealthcare.INDIA_ARCHIVE_URL, indiaArchiveHtml],
    ['https://simplifyhealthcare.com/careers/current-openings/india/project-manager-2/', projectManagerHtml],
    ['https://simplifyhealthcare.com/careers/current-openings/india/product-manager/', productManagerHtml],
    ['https://simplifyhealthcare.com/careers/current-openings/india/product-marketing-lead/', productMarketingLeadHtml],
  ])

  const requestedUrls = []
  const jobs = await simplifyHealthcare.createSimplifyHealthcareScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      const html = pagesByUrl.get(url)
      if (!html) {
        throw new Error(`Unexpected URL: ${url}`)
      }
      return html
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://simplifyhealthcare.com/careers/current-openings/',
    'https://simplifyhealthcare.com/category/careers/current-openings/india/',
    'https://simplifyhealthcare.com/careers/current-openings/india/project-manager-2/',
    'https://simplifyhealthcare.com/careers/current-openings/india/product-manager/',
    'https://simplifyhealthcare.com/careers/current-openings/india/product-marketing-lead/',
  ])

  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      postingDate: job.postingDate,
      remoteStatus: job.remoteStatus,
      source: job.source,
      link: job.link,
    })),
    [
      {
        title: 'Project Manager',
        location: 'Pune, India',
        postingDate: '2026-06-22',
        remoteStatus: 'Hybrid',
        source: 'simplifyhealthcare',
        link: 'https://simplifyhealthcare.com/careers/current-openings/india/project-manager-2/',
      },
      {
        title: 'Product Manager',
        location: 'Pune, India',
        postingDate: '2026-06-12',
        remoteStatus: 'On-site',
        source: 'simplifyhealthcare',
        link: 'https://simplifyhealthcare.com/careers/current-openings/india/product-manager/',
      },
      {
        title: 'Product Marketing Lead',
        location: 'Pune, India',
        postingDate: '2026-04-10',
        remoteStatus: 'Remote',
        source: 'simplifyhealthcare',
        link: 'https://simplifyhealthcare.com/careers/current-openings/india/product-marketing-lead/',
      },
    ],
  )
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('Simplify Healthcare fails closed when the verified official careers surface changes', async () => {
  const simplifyHealthcare = await loadSimplifyHealthcareModule()
  assert.ok(simplifyHealthcare, 'Expected Simplify Healthcare scraper module at ./script.js')

  await assert.rejects(
    simplifyHealthcare.createSimplifyHealthcareScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1><p>No verified board.</p></body></html>',
    }),
    /verified official public careers surface/i,
  )
})
