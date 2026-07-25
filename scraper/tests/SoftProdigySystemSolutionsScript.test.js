import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../softprodigysystemsolutions/script.js')
  } catch {
    assert.fail('Expected SoftProdigy System Solutions scraper module at ../softprodigysystemsolutions/script.js')
  }
}

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>SoftProdigy | AI &amp; Software Development Services</title>
  </head>
  <body>
    <a href="https://softprodigy.keka.com/careers/">Careers</a>
    <h1>Digital Transformation, Engineered for Impact</h1>
  </body>
</html>
`

const kekaBoardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>SoftProdigy Careers</title>
  </head>
  <body>
    <h1>Be a part of building something great</h1>
    <p>Browse all jobs</p>
    <div class="job-card">
      <a href="/careers/jobdetails/101">Senior Software Engineer</a>
      <span>Chandigarh, India</span>
      <span>Full Time</span>
    </div>
    <div class="job-card">
      <a href="/careers/jobdetails/202">QA Automation Engineer</a>
      <span>Mohali, India</span>
      <span>Full Time</span>
    </div>
    <footer>SoftProdigy System Solutions Pvt. Ltd. &copy; 2026 Keka Hire. Powered by Keka.</footer>
  </body>
</html>
`

test('SoftProdigy System Solutions validates the verified homepage handoff and extracts Keka board jobs', async () => {
  const softProdigy = await loadModule()

  assert.equal(softProdigy.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(
    softProdigy.extractKekaBoardUrl(homepageHtml),
    'https://softprodigy.keka.com/careers/',
  )
  assert.equal(softProdigy.hasKekaBoardSignal(kekaBoardHtml), true)
  assert.deepEqual(softProdigy.extractJobCards(kekaBoardHtml), [
    {
      title: 'Senior Software Engineer',
      location: 'Chandigarh, India',
      employmentType: 'Full Time',
      sourceUrl: 'https://softprodigy.keka.com/careers/jobdetails/101',
      applyUrl: 'https://softprodigy.keka.com/careers/jobdetails/101',
    },
    {
      title: 'QA Automation Engineer',
      location: 'Mohali, India',
      employmentType: 'Full Time',
      sourceUrl: 'https://softprodigy.keka.com/careers/jobdetails/202',
      applyUrl: 'https://softprodigy.keka.com/careers/jobdetails/202',
    },
  ])
})

test('SoftProdigy System Solutions run returns normalized jobs from the verified Keka board', async () => {
  const softProdigy = await loadModule()
  const requestedUrls = []

  const jobs = await softProdigy.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === softProdigy.HOMEPAGE_URL) return homepageHtml
      if (url === softProdigy.KEKA_BOARD_URL) return kekaBoardHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-17T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    softProdigy.HOMEPAGE_URL,
    softProdigy.KEKA_BOARD_URL,
  ])
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      link: job.link,
      source: job.source,
      scrapedAt: job.scrapedAt,
    })),
    [
      {
        title: 'Senior Software Engineer',
        location: 'Chandigarh, India',
        link: 'https://softprodigy.keka.com/careers/jobdetails/101',
        source: 'softprodigysystemsolutions',
        scrapedAt: '2026-07-17T00:00:00.000Z',
      },
      {
        title: 'QA Automation Engineer',
        location: 'Mohali, India',
        link: 'https://softprodigy.keka.com/careers/jobdetails/202',
        source: 'softprodigysystemsolutions',
        scrapedAt: '2026-07-17T00:00:00.000Z',
      },
    ],
  )
})

test('SoftProdigy System Solutions fails closed when the homepage handoff or Keka board shell changes', async () => {
  const softProdigy = await loadModule()

  await assert.rejects(
    softProdigy.run({
      fetchText: async (url) => {
        if (url === softProdigy.HOMEPAGE_URL) {
          return '<html><body><a href="/career/">Careers</a></body></html>'
        }
        return kekaBoardHtml
      },
    }),
    /verified homepage careers handoff/i,
  )

  await assert.rejects(
    softProdigy.run({
      fetchText: async (url) => {
        if (url === softProdigy.HOMEPAGE_URL) return homepageHtml
        return '<html><body><h1>Contact us</h1></body></html>'
      },
    }),
    /verified keka board shell/i,
  )
})
