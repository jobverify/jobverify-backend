import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const practoCareersHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Practo | Careers</title>
    <meta name="description" content="Practo Careers">
    <base href="/practo/">
  </head>
  <body>
    <app-root></app-root>
    <button id="current_openings">Current Openings</button>
    <section id="jobs">Search Jobs</section>
    <script src="runtime.8062548306377782.js" type="module"></script>
    <script src="main.67346d0ad0dd7169.js" type="module"></script>
  </body>
</html>
`

const currentPractoCareersHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Practo | Careers</title>
    <meta name="description" content="Practo Careers">
    <base href="/practo/">
  </head>
  <body>
    <app-root></app-root>
    <script>
      $("#current_openings").click(function() {
        $('html, body').animate({
          scrollTop: $("#jobs").offset().top
        }, 1000);
      });
    </script>
    <script src="runtime.8062548306377782.js" type="module"></script>
    <script src="polyfills.712cec7b40080dce.js" type="module"></script>
    <script src="main.67346d0ad0dd7169.js" type="module"></script>
  </body>
</html>
`

const hiddenClosedSearchPayload = {
  data: {
    data: [
      {
        _source: {
          jobTitle: 'Head Customer Support',
          jobUrl: 'head-customer-support-bengaluru-karnataka-india-2026071512583918',
          referenceNumber: '10015',
          otherStatusOne: 'Hidden',
          otherStatusTwo: 'Closed',
          requisitionStatus: 'A',
          appliesNotBlocked: 0,
          jobVisibiltyLevel: 'N',
        },
      },
      {
        _source: {
          jobTitle: 'Creative Strategist Manager',
          jobUrl: 'creative-strategist-manager-bengaluru-karnataka-india-2026062919200350',
          referenceNumber: '10002',
          otherStatusOne: 'Hidden',
          otherStatusTwo: 'Closed',
          requisitionStatus: 'A',
          appliesNotBlocked: 0,
          jobVisibiltyLevel: 'E',
        },
      },
    ],
  },
}

const payloadWithPublicDrift = {
  data: {
    data: [
      {
        _source: {
          jobTitle: 'Head Customer Support',
          jobUrl: 'head-customer-support-bengaluru-karnataka-india-2026071512583918',
          referenceNumber: '10015',
          otherStatusOne: 'Hidden',
          otherStatusTwo: 'Closed',
          requisitionStatus: 'A',
          appliesNotBlocked: 0,
          jobVisibiltyLevel: 'N',
        },
      },
      {
        _source: {
          jobTitle: 'Senior Product Analyst',
          jobUrl: 'senior-product-analyst-bengaluru-karnataka-india-2026071709150001',
          referenceNumber: '10099',
          otherStatusOne: 'Visible',
          otherStatusTwo: 'Open',
          requisitionStatus: 'A',
          appliesNotBlocked: 1,
          jobVisibiltyLevel: 'L',
        },
      },
    ],
  },
}

const loadPractoModule = async () => {
  try {
    return await import('../practo/script.js')
  } catch {
    assert.fail('Expected Practo scraper module at ../practo/script.js')
  }
}

test('Practo script pins the verified first-party careers shell and hidden-and-closed Zwayam contract', async () => {
  const practo = await loadPractoModule()

  assert.equal(practo.SOURCE, 'practo')
  assert.equal(practo.COMPANY, 'Practo')
  assert.equal(practo.OFFICIAL_BRAND_NAME, 'Practo')
  assert.equal(practo.VERIFIED_ON, '2026-07-26')
  assert.equal(practo.OFFICIAL_CAREERS_URL, 'https://careers.practo.com/practo/')
  assert.equal(practo.SEARCH_API_URL, 'https://public.zwayam.com/jobs/search')
  assert.equal(typeof practo.buildSearchPayload, 'function')
  assert.equal(typeof practo.hasVerifiedCareersShellSignals, 'function')
  assert.equal(typeof practo.extractSearchRecords, 'function')
  assert.equal(typeof practo.isSuppressedRecord, 'function')
  assert.equal(typeof practo.allSearchRecordsAreSuppressed, 'function')
  assert.equal(typeof practo.createPractoScraper, 'function')

  assert.deepEqual(practo.buildSearchPayload(), {
    companyId: 'practo',
  })

  assert.equal(practo.hasVerifiedCareersShellSignals(practoCareersHtml), true)
  assert.equal(practo.hasVerifiedCareersShellSignals(currentPractoCareersHtml), true)
  assert.equal(practo.hasVerifiedCareersShellSignals('<html><body>No trusted Practo careers shell</body></html>'), false)

  assert.equal(practo.extractSearchRecords(hiddenClosedSearchPayload).length, 2)
  assert.equal(practo.allSearchRecordsAreSuppressed(hiddenClosedSearchPayload), true)
  assert.equal(practo.allSearchRecordsAreSuppressed(payloadWithPublicDrift), false)
})

test('Practo run returns [] only while the official search payload remains hidden and closed', async () => {
  const { OFFICIAL_CAREERS_URL, SEARCH_API_URL, createPractoScraper } = await loadPractoModule()
  const requests = []
  const jobs = await createPractoScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requests.push({ url, type: 'text' })
      if (url === OFFICIAL_CAREERS_URL) return practoCareersHtml
      throw new Error(`Unexpected text URL ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requests.push({ url, type: 'json', options })
      if (url === SEARCH_API_URL) return hiddenClosedSearchPayload
      throw new Error(`Unexpected JSON URL ${url}`)
    },
  })

  assert.deepEqual(requests, [
    {
      url: 'https://careers.practo.com/practo/',
      type: 'text',
    },
    {
      url: 'https://public.zwayam.com/jobs/search',
      type: 'json',
      options: {
        method: 'POST',
        form: {
          companyId: 'practo',
        },
      },
    },
  ])

  assert.deepEqual(jobs, [])
})

test('Practo fails closed when the verified shell drifts or the official payload exposes public jobs', async () => {
  const { createPractoScraper } = await loadPractoModule()
  const scraper = createPractoScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async () => '<html><body>Unexpected shell</body></html>',
      fetchJson: async () => hiddenClosedSearchPayload,
    }),
    /verified careers shell/i,
  )

  await assert.rejects(
    scraper.run({
      fetchText: async () => practoCareersHtml,
      fetchJson: async () => payloadWithPublicDrift,
    }),
    /public jobs/i,
  )

  await assert.rejects(
    scraper.run({
      fetchText: async () => practoCareersHtml,
      fetchJson: async () => ({ data: { data: [] } }),
    }),
    /public jobs/i,
  )
})
