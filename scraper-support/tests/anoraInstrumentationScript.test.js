import assert from 'node:assert/strict'
import test from 'node:test'

const LISTING_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h2>Discover opportunities</h2>
    <a href="https://anoralabs.com/applyforjob.html">DFT Lead Engineer Banglore</a>
    <a href="https://anoralabs.com/applyforjobmd.html">Mechanical Design Engineer Chennai</a>
    <a href="https://anorasolutions.com/applyforjobpd.html">Product Development Engineer Bangalore</a>
    <a href="/applyforjobsl.html">Application Software Lead Engineer Chennai</a>
  </body>
</html>
`

const DETAIL_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h2>Application Software Lead Engineer</h2>
    <p>Chennai</p>
    <h3>Summary</h3>
    <p>The Software Lead/Engineer will be responsible for developing device drivers for Electrical and Electronic bench/rack equipment along with Hardware design engineers.</p>
    <h3>Key Qualifications</h3>
    <ul>
      <li>Bachelor's/Master's degree in Electronics/Electrical/Instrumentation/Computer Science Engineering.</li>
      <li>Good experience in object-oriented programming languages like Python/Java/C++/C# etc.</li>
      <li>5+ years of work experience in Application SW Design.</li>
    </ul>
    <h3>Responsibilities</h3>
    <ul>
      <li>Interacting with customers, requirement gathering and SW planning.</li>
      <li>Developing device drivers for Electrical and Electronic bench/rack equipment.</li>
    </ul>
    <h3>Additional Requirements</h3>
    <ul>
      <li>Strong analytical and problem-solving skills.</li>
      <li>Good communication skills.</li>
    </ul>
    <label>Add your attachment</label>
  </body>
</html>
`

const loadAnoraModule = async () => {
  try {
    return await import('../../scraper/anorainstrumentation/script.js')
  } catch {
    assert.fail('Expected Anora Instrumentation scraper module at ../../scraper/anorainstrumentation/script.js')
  }
}

test('hasOfficialCareersSignal validates the verified Anora careers surface', async () => {
  const anora = await loadAnoraModule()

  assert.equal(anora.hasOfficialCareersSignal(LISTING_HTML), true)
})

test('extractJobUrls keeps unique Anora apply-page links from the official careers page', async () => {
  const anora = await loadAnoraModule()

  assert.equal(anora.CAREERS_PAGE_URL, 'https://anoralabs.com/careers.html')
  assert.deepEqual(anora.extractJobUrls(LISTING_HTML), [
    'https://anoralabs.com/applyforjob.html',
    'https://anoralabs.com/applyforjobmd.html',
    'https://anoralabs.com/applyforjobpd.html',
    'https://anoralabs.com/applyforjobsl.html',
  ])
})

test('extractJobDetail maps Anora detail pages into scraper jobs', async () => {
  const anora = await loadAnoraModule()

  assert.deepEqual(
    anora.extractJobDetail(DETAIL_HTML, 'https://anoralabs.com/applyforjobsl.html'),
    {
      title: 'Application Software Lead Engineer',
      company: 'Anora Instrumentation Private Limited',
      department: null,
      location: 'Chennai, India',
      city: 'Chennai',
      country: 'India',
      jobId: 'anorainstrumentation-application-software-lead-engineer',
      requisitionId: 'anorainstrumentation-application-software-lead-engineer',
      sourceUrl: 'https://anoralabs.com/applyforjobsl.html',
      applyUrl: 'https://anoralabs.com/applyforjobsl.html',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: "Bachelor's/Master's degree in Electronics/Electrical/Instrumentation/Computer Science Engineering.",
      preferredQualification: null,
      requiredSkills: [
        "Bachelor's/Master's degree in Electronics/Electrical/Instrumentation/Computer Science Engineering.",
        'Good experience in object-oriented programming languages like Python/Java/C++/C# etc.',
        '5+ years of work experience in Application SW Design.',
        'Interacting with customers, requirement gathering and SW planning.',
        'Developing device drivers for Electrical and Electronic bench/rack equipment.',
        'Strong analytical and problem-solving skills.',
        'Good communication skills.',
      ],
      postingDate: null,
      closingDate: null,
      jobDescription: "The Software Lead/Engineer will be responsible for developing device drivers for Electrical and Electronic bench/rack equipment along with Hardware design engineers. Bachelor's/Master's degree in Electronics/Electrical/Instrumentation/Computer Science Engineering. Good experience in object-oriented programming languages like Python/Java/C++/C# etc. 5+ years of work experience in Application SW Design. Interacting with customers, requirement gathering and SW planning. Developing device drivers for Electrical and Electronic bench/rack equipment. Strong analytical and problem-solving skills. Good communication skills.",
      remoteStatus: 'On-site',
    },
  )
})

test('run fetches Anora listing and detail pages and decorates runner fields', async () => {
  const anora = await loadAnoraModule()
  const requestedUrls = []

  const jobs = await anora.createAnoraInstrumentationScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === anora.CAREERS_PAGE_URL) return LISTING_HTML
      if (url === 'https://anoralabs.com/applyforjob.html') return DETAIL_HTML.replace(/Application Software Lead Engineer/g, 'DFT Lead Engineer').replace(/Chennai/g, 'Bangalore')
      if (url === 'https://anoralabs.com/applyforjobmd.html') return DETAIL_HTML.replace(/Application Software Lead Engineer/g, 'Mechanical Design Engineer')
      if (url === 'https://anoralabs.com/applyforjobpd.html') return DETAIL_HTML.replace(/Application Software Lead Engineer/g, 'Product Development Engineer').replace(/Chennai/g, 'Banglore')
      if (url === 'https://anoralabs.com/applyforjobsl.html') return DETAIL_HTML
      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-09T12:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    anora.CAREERS_PAGE_URL,
    'https://anoralabs.com/applyforjob.html',
    'https://anoralabs.com/applyforjobmd.html',
    'https://anoralabs.com/applyforjobpd.html',
    'https://anoralabs.com/applyforjobsl.html',
  ])
  assert.equal(jobs.length, 4)
  assert.equal(jobs[0].source, 'anorainstrumentation')
  assert.equal(jobs[0].link, jobs[0].sourceUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-09T12:00:00.000Z')
})

test('run fails closed when the Anora careers surface changes', async () => {
  const anora = await loadAnoraModule()

  await assert.rejects(
    anora.createAnoraInstrumentationScraper().run({
      fetchText: async () => '<html><body>No opportunities here</body></html>',
    }),
    /verified Anora careers surface/i,
  )
})
