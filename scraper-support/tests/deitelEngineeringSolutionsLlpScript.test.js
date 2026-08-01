import assert from 'node:assert/strict'
import test from 'node:test'

const loadDeitelModule = async () => {
  try {
    return await import('../../scraper/deitelengineeringsolutionsllp/script.js')
  } catch {
    assert.fail('Expected DEITEL Engineering Solutions LLP scraper module at ../../scraper/deitelengineeringsolutionsllp/script.js')
  }
}

const officialHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>DEITEL &#8211; Engineering|Resource|Solutions</title>
  </head>
  <body>
    <header>
      <a href="https://deitel.in/">Home</a>
      <a href="https://deitel.in/career/">Career</a>
      <div class="tagline site-description">Engineering|Resource|Solutions</div>
    </header>
  </body>
</html>
`

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career &#8211; DEITEL</title>
    <link rel="canonical" href="https://deitel.in/career/" />
  </head>
  <body>
    <main>
      <article>
        <h1 class="entry-title">Career</h1>
        <div class="entry-content">
          <p>
            <em>
              Candidates with relevant experience in following areas can apply to
              <span style="text-decoration: underline;">
                <span style="color: #0000ff; text-decoration: underline;">hr@deitel.in</span>
              </span>
            </em>
          </p>
          <ul>
            <li>Mechanical design for automotive and non-auto domains</li>
            <li>Analysis and simulation engineers</li>
            <li>Manufacturing engineering</li>
            <li>Automotive electronics and embedded system areas</li>
            <li>Technical writers and illustrators with aero/non-aero background</li>
            <li>Senior engineers/Subject matter experts in key engineering domains (30+ years exp)</li>
          </ul>
        </div>
      </article>
    </main>
  </body>
</html>
`

test('DEITEL Engineering Solutions LLP validates the verified homepage and extracts role areas from the official careers page', async () => {
  const deitel = await loadDeitelModule()

  assert.equal(deitel.SOURCE, 'deitelengineeringsolutionsllp')
  assert.equal(deitel.COMPANY, 'DEITEL Engineering Solutions LLP')
  assert.equal(deitel.HOMEPAGE_URL, 'https://deitel.in/')
  assert.equal(deitel.CAREERS_URL, 'https://deitel.in/career/')
  assert.equal(deitel.APPLICATION_EMAIL, 'hr@deitel.in')
  assert.equal(deitel.APPLICATION_URL, 'mailto:hr@deitel.in')
  assert.equal(deitel.hasOfficialHomepageSignal(officialHomepageHtml), true)
  assert.equal(deitel.hasOfficialCareersSignal(officialCareersHtml), true)

  const jobs = deitel.extractOpenings(officialCareersHtml)

  assert.equal(jobs.length, 6)
  assert.deepEqual(
    jobs.map((job) => job.title),
    [
      'Mechanical design for automotive and non-auto domains',
      'Analysis and simulation engineers',
      'Manufacturing engineering',
      'Automotive electronics and embedded system areas',
      'Technical writers and illustrators with aero/non-aero background',
      'Senior engineers/Subject matter experts in key engineering domains (30+ years exp)',
    ],
  )
  assert.deepEqual(jobs[0], {
    title: 'Mechanical design for automotive and non-auto domains',
    company: 'DEITEL Engineering Solutions LLP',
    department: null,
    location: null,
    city: null,
    country: 'India',
    jobId: 'deitelengineeringsolutionsllp-mechanical-design-for-automotive-and-non-auto-domains',
    requisitionId: 'deitelengineeringsolutionsllp-mechanical-design-for-automotive-and-non-auto-domains',
    sourceUrl: 'https://deitel.in/career/',
    applyUrl: 'mailto:hr@deitel.in',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Official DEITEL Engineering Solutions LLP role area published on the first-party careers page. Apply via hr@deitel.in.',
  })
})

test('DEITEL Engineering Solutions LLP run validates the first-party handoff and decorates the extracted roles', async () => {
  const deitel = await loadDeitelModule()
  const requestedUrls = []

  const jobs = await deitel.createDeitelEngineeringSolutionsLlpScraper({
    now: () => '2026-07-11T10:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === deitel.HOMEPAGE_URL) return officialHomepageHtml
      if (url === deitel.CAREERS_URL) return officialCareersHtml

      throw new Error(`Unexpected DEITEL fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    deitel.HOMEPAGE_URL,
    deitel.CAREERS_URL,
  ])
  assert.equal(jobs.length, 6)
  assert.deepEqual(jobs[0], {
    title: 'Mechanical design for automotive and non-auto domains',
    company: 'DEITEL Engineering Solutions LLP',
    department: null,
    location: null,
    city: null,
    country: 'India',
    jobId: 'deitelengineeringsolutionsllp-mechanical-design-for-automotive-and-non-auto-domains',
    requisitionId: 'deitelengineeringsolutionsllp-mechanical-design-for-automotive-and-non-auto-domains',
    sourceUrl: 'https://deitel.in/career/',
    applyUrl: 'mailto:hr@deitel.in',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Official DEITEL Engineering Solutions LLP role area published on the first-party careers page. Apply via hr@deitel.in.',
    source: 'deitelengineeringsolutionsllp',
    link: 'mailto:hr@deitel.in',
    scrapedAt: '2026-07-11T10:00:00.000Z',
  })
})

test('DEITEL Engineering Solutions LLP fails closed when the verified homepage, careers surface, or role list drifts', async () => {
  const deitel = await loadDeitelModule()

  await assert.rejects(
    deitel.createDeitelEngineeringSolutionsLlpScraper().run({
      fetchText: async (url) => {
        if (url === deitel.HOMEPAGE_URL) {
          return '<html><head><title>Unexpected</title></head><body></body></html>'
        }

        throw new Error(`Unexpected DEITEL fixture URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    deitel.createDeitelEngineeringSolutionsLlpScraper().run({
      fetchText: async (url) => {
        if (url === deitel.HOMEPAGE_URL) return officialHomepageHtml
        if (url === deitel.CAREERS_URL) {
          return officialCareersHtml.replaceAll('hr@deitel.in', 'contact@example.com')
        }

        throw new Error(`Unexpected DEITEL fixture URL: ${url}`)
      },
    }),
    /verified official careers page/i,
  )

  await assert.rejects(
    deitel.createDeitelEngineeringSolutionsLlpScraper().run({
      fetchText: async (url) => {
        if (url === deitel.HOMEPAGE_URL) return officialHomepageHtml
        if (url === deitel.CAREERS_URL) {
          return officialCareersHtml.replace(
            /<ul>[\s\S]*?<\/ul>/i,
            '<section><h2>Search Jobs</h2><a href="/career/job-1">Apply Now</a></section>',
          )
        }

        throw new Error(`Unexpected DEITEL fixture URL: ${url}`)
      },
    }),
    /verified public role list/i,
  )
})
