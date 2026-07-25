import assert from 'node:assert/strict'
import test from 'node:test'

const loadHindustanUnileverModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Hindustan Unilever scraper module at ./script.js')
  }
}

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>India</title>
  </head>
  <body>
    <main>
      <h1>India</h1>
      <h2>Our local jobs</h2>
      <ul>
        <li>
          <a href="https://careers.unilever.com/en/job/bengaluru/senior-executive-operational-transfer-pricing/34155/97561245184">
            Senior Executive - Operational Transfer Pricing
            <span>Bengaluru, India</span>
          </a>
        </li>
        <li>
          <a href="https://careers.unilever.com/en/job/bengaluru/logistics-analytics-product-engineer/34155/97561244896">
            Logistics Analytics Product Engineer
            <span>Bengaluru, India</span>
          </a>
        </li>
        <li>
          <a href="https://careers.unilever.com/en/job/gurgaon/key-account-executive/34155/97561244992">
            Key Account Executive
            <span>Gurgaon, India</span>
          </a>
        </li>
        <li>
          <a href="https://careers.unilever.com/en/job/bengaluru/finance-manager-corporate-fet-operations-gbs-gdt/34155/97561245088">
            Finance Manager Corporate FET Operations - GBS-GDT
            <span>Bengaluru, India</span>
          </a>
        </li>
      </ul>
    </main>
  </body>
</html>
`

test('Hindustan Unilever scraper validates the verified official India careers surface', async () => {
  const hindustanUnilever = await loadHindustanUnileverModule()

  assert.equal(hindustanUnilever.SOURCE, 'hindustanunilever')
  assert.equal(hindustanUnilever.COMPANY, 'Hindustan Unilever Limited')
  assert.equal(hindustanUnilever.CAREERS_URL, 'https://www.hul.co.in/careers/')
  assert.equal(hindustanUnilever.LOCATION_PAGE_URL, 'https://careers.unilever.com/en/india')
  assert.equal(hindustanUnilever.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.deepEqual(
    hindustanUnilever.extractLocalJobs(officialCareersHtml).map((job) => ({
      title: job.title,
      location: job.location,
      applyUrl: job.applyUrl,
    })),
    [
      {
        title: 'Senior Executive - Operational Transfer Pricing',
        location: 'Bengaluru, India',
        applyUrl: 'https://careers.unilever.com/en/job/bengaluru/senior-executive-operational-transfer-pricing/34155/97561245184',
      },
      {
        title: 'Logistics Analytics Product Engineer',
        location: 'Bengaluru, India',
        applyUrl: 'https://careers.unilever.com/en/job/bengaluru/logistics-analytics-product-engineer/34155/97561244896',
      },
      {
        title: 'Key Account Executive',
        location: 'Gurgaon, India',
        applyUrl: 'https://careers.unilever.com/en/job/gurgaon/key-account-executive/34155/97561244992',
      },
      {
        title: 'Finance Manager Corporate FET Operations - GBS-GDT',
        location: 'Bengaluru, India',
        applyUrl: 'https://careers.unilever.com/en/job/bengaluru/finance-manager-corporate-fet-operations-gbs-gdt/34155/97561245088',
      },
    ],
  )
})

test('Hindustan Unilever scraper returns the local jobs exposed on the verified official India careers page', async () => {
  const hindustanUnilever = await loadHindustanUnileverModule()
  const requestedUrls = []

  const jobs = await hindustanUnilever.createHindustanUnileverScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === hindustanUnilever.CAREERS_URL) {
        return '<html><head><meta http-equiv="refresh" content="0;url=https://careers.unilever.com/en/india"></head></html>'
      }
      if (url === hindustanUnilever.LOCATION_PAGE_URL) return officialCareersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    hindustanUnilever.CAREERS_URL,
    hindustanUnilever.LOCATION_PAGE_URL,
  ])
  assert.equal(jobs.length, 4)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      country: job.country,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
    })),
    [
      {
        title: 'Finance Manager Corporate FET Operations - GBS-GDT',
        location: 'Bengaluru, India',
        country: 'India',
        sourceUrl: hindustanUnilever.LOCATION_PAGE_URL,
        applyUrl: 'https://careers.unilever.com/en/job/bengaluru/finance-manager-corporate-fet-operations-gbs-gdt/34155/97561245088',
      },
      {
        title: 'Key Account Executive',
        location: 'Gurgaon, India',
        country: 'India',
        sourceUrl: hindustanUnilever.LOCATION_PAGE_URL,
        applyUrl: 'https://careers.unilever.com/en/job/gurgaon/key-account-executive/34155/97561244992',
      },
      {
        title: 'Logistics Analytics Product Engineer',
        location: 'Bengaluru, India',
        country: 'India',
        sourceUrl: hindustanUnilever.LOCATION_PAGE_URL,
        applyUrl: 'https://careers.unilever.com/en/job/bengaluru/logistics-analytics-product-engineer/34155/97561244896',
      },
      {
        title: 'Senior Executive - Operational Transfer Pricing',
        location: 'Bengaluru, India',
        country: 'India',
        sourceUrl: hindustanUnilever.LOCATION_PAGE_URL,
        applyUrl: 'https://careers.unilever.com/en/job/bengaluru/senior-executive-operational-transfer-pricing/34155/97561245184',
      },
    ],
  )
})

test('Hindustan Unilever scraper fails closed when the verified official India careers surface changes', async () => {
  const hindustanUnilever = await loadHindustanUnileverModule()

  await assert.rejects(
    hindustanUnilever.createHindustanUnileverScraper().run({
      fetchText: async (url) => {
        if (url === hindustanUnilever.CAREERS_URL) {
          return '<html><body><a href="https://careers.unilever.com/en/india">India careers</a></body></html>'
        }

        return '<main><h1>India</h1><p>No local jobs section.</p></main>'
      },
    }),
    /verified official india careers surface/i,
  )
})
