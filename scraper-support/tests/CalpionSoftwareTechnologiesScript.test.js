import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers & Job Opportunities | Work Culture and Values | Calpion</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <div class="career-card">
        <h3 class="career-blog-title">Lead - AWS</h3>
        <p class="career-card-des">Own AWS delivery for healthcare analytics platforms.</p>
        <a href="/career/lead-aws">Apply Now</a>
      </div>
      <div class="career-card">
        <h3 class="career-blog-title">Marketing Coordinator</h3>
        <p class="career-card-des">Support demand generation and campaigns.</p>
        <a href="/career/marketing-coordinator">Apply Now</a>
      </div>
      <div class="career-card">
        <h3 class="career-blog-title">Process Associate - Charge Entry</h3>
        <p class="career-card-des">Work on revenue cycle management operations.</p>
        <a href="/career/process-associate-charge-entry">Apply Now</a>
      </div>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/calpionsoftwaretechnologies/script.js')
  } catch {
    assert.fail('Expected Calpion Software Technologies scraper module at ../../scraper/calpionsoftwaretechnologies/script.js')
  }
}

test('Calpion Software Technologies keeps the verified first-party career-card parser pinned', async () => {
  const calpion = await loadModule()

  assert.equal(calpion.CAREERS_URL, 'https://www.calpion.com/career')
  assert.equal(calpion.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(
    calpion.extractCareerCards(careersHtml).map((job) => [job.title, job.summary, job.applyUrl]),
    [
      [
        'Lead - AWS',
        'Own AWS delivery for healthcare analytics platforms.',
        'https://www.calpion.com/career/lead-aws',
      ],
      [
        'Marketing Coordinator',
        'Support demand generation and campaigns.',
        'https://www.calpion.com/career/marketing-coordinator',
      ],
      [
        'Process Associate - Charge Entry',
        'Work on revenue cycle management operations.',
        'https://www.calpion.com/career/process-associate-charge-entry',
      ],
    ],
  )
})

test('Calpion Software Technologies run returns the visible first-party role cards from the verified careers page', async () => {
  const calpion = await loadModule()
  const requestedUrls = []

  const jobs = await calpion.createCalpionSoftwareTechnologiesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, ['https://www.calpion.com/career'])
  assert.deepEqual(
    jobs.map((job) => [job.title, job.jobDescription, job.applyUrl, job.source, job.scrapedAt]),
    [
      [
        'Lead - AWS',
        'Own AWS delivery for healthcare analytics platforms.',
        'https://www.calpion.com/career/lead-aws',
        'calpionsoftwaretechnologies',
        '2026-07-18T00:00:00.000Z',
      ],
      [
        'Marketing Coordinator',
        'Support demand generation and campaigns.',
        'https://www.calpion.com/career/marketing-coordinator',
        'calpionsoftwaretechnologies',
        '2026-07-18T00:00:00.000Z',
      ],
      [
        'Process Associate - Charge Entry',
        'Work on revenue cycle management operations.',
        'https://www.calpion.com/career/process-associate-charge-entry',
        'calpionsoftwaretechnologies',
        '2026-07-18T00:00:00.000Z',
      ],
    ],
  )
})

test('Calpion Software Technologies fails closed when the verified first-party careers surface drifts', async () => {
  const calpion = await loadModule()

  await assert.rejects(
    calpion.createCalpionSoftwareTechnologiesScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified calpion careers surface/i,
  )
})
