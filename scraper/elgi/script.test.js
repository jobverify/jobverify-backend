import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const officialCareersHtml = `
  <!doctype html>
  <html lang="en-IN">
    <head>
      <title>Careers in ELGi</title>
    </head>
    <body>
      <section class="hero">
        <div class="deming-title">WE'RE ALWAYS BETTER. <br /> AND THAT'S A PROMISE</div>
      </section>
      <section>
        <div class="main-title text-center">ARE YOU RIGHT FOR US?</div>
        <a href="https://elgi.darwinbox.in/ms/candidate/a61e65404e890b/careers" class="explore-jobs-btn" target="_blank">EXPLORE OUR JOBS</a>
      </section>
    </body>
  </html>
`

test('ELGi scraper pins the verified official careers page and Darwinbox public handoff', async () => {
  const elgi = await loadModule()
  assert.ok(elgi, 'ELGi scraper module should load')

  const {
    DARWINBOX_COMPANY_ID,
    DARWINBOX_CAREERS_URL,
    DARWINBOX_ORIGIN,
    OFFICIAL_CAREERS_URL,
    OFFICIAL_PAGE_TITLE,
    extractDarwinboxCareersUrl,
    hasOfficialElgiCareersSignals,
  } = elgi

  assert.equal(OFFICIAL_CAREERS_URL, 'https://www.elgi.com/careers/')
  assert.equal(OFFICIAL_PAGE_TITLE, 'Careers in ELGi')
  assert.equal(DARWINBOX_ORIGIN, 'https://elgi.darwinbox.in')
  assert.equal(DARWINBOX_COMPANY_ID, 'a61e65404e890b')
  assert.equal(
    DARWINBOX_CAREERS_URL,
    'https://elgi.darwinbox.in/ms/candidate/a61e65404e890b/careers',
  )
  assert.equal(hasOfficialElgiCareersSignals(officialCareersHtml), true)
  assert.equal(
    extractDarwinboxCareersUrl(officialCareersHtml),
    'https://elgi.darwinbox.in/ms/candidate/a61e65404e890b/careers',
  )
})

test('ELGi scraper validates the official page then decorates Darwinbox India jobs', async () => {
  const elgi = await loadModule()
  assert.ok(elgi, 'ELGi scraper module should load')

  const { DARWINBOX_CAREERS_URL, OFFICIAL_CAREERS_URL, createElgiScraper } = elgi

  const requestedUrls = []
  const requestedPages = []

  const jobs = await createElgiScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, OFFICIAL_CAREERS_URL)
      return officialCareersHtml
    },
    fetchListingPage: async ({ page, pageSize, companyId }) => {
      requestedPages.push({ page, pageSize, companyId })

      return {
        data: [
          {
            id: 'job-001',
            title: 'Senior Engineer',
            department_name: 'Engineering',
            locations: 'Coimbatore, Tamil Nadu, India',
            country: 'India',
            emp_type_name: 'Full Time',
            experience: '5 - 8 Years',
            posted_on: '08-Jul-2026',
            jd: '<p>Build compressor systems</p>',
          },
          {
            id: 'job-us-001',
            title: 'Sales Manager',
            department_name: 'Sales',
            locations: 'Houston, Texas, United States',
            country: 'United States',
            emp_type_name: 'Full Time',
            experience: '8 - 10 Years',
            posted_on: '07-Jul-2026',
            jd: '<p>Drive US growth</p>',
          },
        ],
        job_counts: 2,
      }
    },
  })

  assert.deepEqual(requestedUrls, [OFFICIAL_CAREERS_URL])
  assert.deepEqual(requestedPages, [{
    page: 1,
    pageSize: 10,
    companyId: 'a61e65404e890b',
  }])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Senior Engineer')
  assert.equal(jobs[0].company, 'ELGi')
  assert.equal(jobs[0].location, 'Coimbatore, Tamil Nadu, India')
  assert.equal(jobs[0].city, 'Coimbatore')
  assert.equal(
    jobs[0].sourceUrl,
    'https://elgi.darwinbox.in/ms/candidatev2/a61e65404e890b/careers/jobDetails/job-001',
  )
  assert.equal(jobs[0].applyUrl, jobs[0].sourceUrl)
  assert.equal(jobs[0].link, jobs[0].sourceUrl)
  assert.equal(jobs[0].source, 'elgi')
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
  assert.equal(DARWINBOX_CAREERS_URL, 'https://elgi.darwinbox.in/ms/candidate/a61e65404e890b/careers')
})

test('ELGi browser listing fetcher loads the public allJobs shell and POSTs through same-origin fetch', async () => {
  const elgi = await loadModule()
  assert.ok(elgi, 'ELGi scraper module should load')

  const {
    DARWINBOX_COMPANY_ID,
    DARWINBOX_LISTING_API_URL,
    DARWINBOX_PUBLIC_ALL_JOBS_URL,
    createBrowserListingFetcher,
  } = elgi

  assert.equal(
    DARWINBOX_PUBLIC_ALL_JOBS_URL,
    'https://elgi.darwinbox.in/ms/candidatev2/a61e65404e890b/careers/allJobs',
  )
  assert.equal(
    DARWINBOX_LISTING_API_URL,
    'https://elgi.darwinbox.in/ms/candidateapi/job/alljobs?companyId=a61e65404e890b',
  )

  const calls = []
  const browser = {
    newPage: async () => page,
    close: async () => calls.push({ type: 'close' }),
  }
  const page = {
    setJavaScriptEnabled: async (enabled) => calls.push({ type: 'setJavaScriptEnabled', enabled }),
    setRequestInterception: async (enabled) => calls.push({ type: 'setRequestInterception', enabled }),
    on: (eventName, handler) => {
      calls.push({ type: 'on', eventName })
    },
    goto: async (url, options) => {
      calls.push({ type: 'goto', url, options })

      return {
        status: () => 200,
        text: async () => '',
      }
    },
    evaluate: async (fn, payload) => {
      calls.push({ type: 'evaluate', payload })
      assert.equal(typeof fn, 'function')

      return {
        status: 200,
        text: JSON.stringify({ status: 'success', data: [], job_counts: 0 }),
      }
    },
  }

  const context = await createBrowserListingFetcher({
    launchBrowserImpl: async () => browser,
  })

  const payload = await context.fetchListingPage({ page: 2, pageSize: 25 })
  await context.close()

  assert.deepEqual(calls.slice(0, 4), [
    { type: 'setJavaScriptEnabled', enabled: false },
    { type: 'setRequestInterception', enabled: true },
    { type: 'on', eventName: 'request' },
    {
      type: 'goto',
      url: DARWINBOX_PUBLIC_ALL_JOBS_URL,
      options: calls[3].options,
    },
  ])
  assert.equal(calls[3].options.waitUntil, 'domcontentloaded')
  assert.equal(Number.isInteger(calls[3].options.timeout), true)
  assert.equal(calls[3].options.timeout > 0, true)
  assert.deepEqual(payload, { status: 'success', data: [], job_counts: 0 })
  assert.deepEqual(calls[4], {
    type: 'evaluate',
    payload: {
      targetApiUrl: DARWINBOX_LISTING_API_URL,
      body: {
        companyId: DARWINBOX_COMPANY_ID,
        sort_option: 'new',
        limit: 25,
        page: 2,
      },
    },
  })
  assert.deepEqual(calls.at(-1), { type: 'close' })
})

test('ELGi browser listing fetcher surfaces non-JSON or non-200 Darwinbox API responses', async () => {
  const elgi = await loadModule()
  assert.ok(elgi, 'ELGi scraper module should load')

  const { createBrowserListingFetcher } = elgi
  const browser = {
    newPage: async () => page,
    close: async () => {},
  }
  const page = {
    setJavaScriptEnabled: async () => {},
    setRequestInterception: async () => {},
    on: () => {},
    goto: async () => ({ status: () => 200, text: async () => '' }),
    evaluate: async () => ({ status: 403, text: '<html>blocked</html>' }),
  }

  const context = await createBrowserListingFetcher({
    launchBrowserImpl: async () => browser,
  })

  await assert.rejects(
    context.fetchListingPage({ page: 1 }),
    /HTTP 403 for ELGi Darwinbox listing API/i,
  )
})

test('ELGi scraper keeps successful jobs when its owned browser context reports Target closed while closing', async () => {
  const elgi = await loadModule()
  assert.ok(elgi, 'ELGi scraper module should load')

  const { createElgiScraper } = elgi
  const listingFetcherOptions = []
  const closeError = new Error('Protocol error (Runtime.callFunctionOn): Target closed')

  const jobs = await createElgiScraper({
    maxJobs: 1,
    createBrowserListingFetcherImpl: async (options) => {
      listingFetcherOptions.push(options)
      return {
        fetchListingPage: async () => ({
          status: 'success',
          data: [
            {
              id: 'job-002',
              title: 'Engineer - Electrical',
              department_name: 'Engineering',
              locations: 'Singanallur, Coimbatore, Tamil Nadu, India',
              country: 'India',
              emp_type_name: 'Full Time',
              experience: '2 - 5 Years',
              posted_on: '18-Jul-2026',
              jd: '<p>Build electrical systems</p>',
            },
          ],
          job_counts: 1,
        }),
        close: async () => {
          throw closeError
        },
      }
    },
  }).run({
    fetchText: async () => officialCareersHtml,
  })

  assert.deepEqual(listingFetcherOptions, [undefined])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Engineer - Electrical')
  assert.equal(jobs[0].source, 'elgi')
})

test('ELGi scraper waits for Darwinbox listing extraction before closing its browser context', async () => {
  const elgi = await loadModule()
  assert.ok(elgi, 'ELGi scraper module should load')

  const events = []
  let listingCanResolve
  const listingReady = new Promise((resolve) => {
    listingCanResolve = resolve
  })

  const jobsPromise = elgi.createElgiScraper({
    maxJobs: 1,
    createBrowserListingFetcherImpl: async () => ({
      fetchListingPage: async () => {
        events.push('fetch:start')
        await listingReady
        events.push('fetch:resolved')
        return {
          status: 'success',
          data: [
            {
              id: 'job-003',
              title: 'Engineer - Testing',
              department_name: 'Engineering',
              locations: 'Coimbatore, Tamil Nadu, India',
              country: 'India',
              emp_type_name: 'Full Time',
              experience: '2 - 5 Years',
              posted_on: '18-Jul-2026',
              jd: '<p>Test compressor systems</p>',
            },
          ],
          job_counts: 1,
        }
      },
      close: async () => {
        events.push('close')
      },
    }),
  }).run({
    fetchText: async () => officialCareersHtml,
  })

  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(events, ['fetch:start'])

  listingCanResolve()
  const jobs = await jobsPromise

  assert.deepEqual(events, ['fetch:start', 'fetch:resolved', 'close'])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Engineer - Testing')
})

test('ELGi scraper rejects an official careers page that no longer matches the verified public surface', async () => {
  const elgi = await loadModule()
  assert.ok(elgi, 'ELGi scraper module should load')

  await assert.rejects(
    elgi.createElgiScraper().run({
      fetchText: async () => '<html><head><title>Careers</title></head><body>Open roles</body></html>',
      fetchListingPage: async () => ({ data: [], job_counts: 0 }),
    }),
    /verified official careers page/i,
  )
})
