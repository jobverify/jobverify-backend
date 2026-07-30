import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-26T00:00:00.000Z'

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs at Koch | Corporate and Capability Roles | Koch</title>
  </head>
  <body>
    <h1>Empowering Koch companies with shared expertise</h1>
    <a href="https://koch.avature.net/en_US/careers/SearchJobs?732=26082375&tags=rm.kcm.web.kcm-004">View open roles</a>
  </body>
</html>
`

const SEARCH_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Search | Koch</title>
  </head>
  <body>
    <article class="article article--result">
      <div class="article__header">
        <div class="article__header__text">
          <h5 class="article__header__text__subtitle">Koch</h5>
          <h3 class="article__header__text__title article__header__text__title--7">
            <a href="https://koch.avature.net/en_US/careers/JobDetail/Delivery-Manager-SAP/191310">
              SAP Delivery Manager
            </a>
          </h3>
        </div>
      </div>
      <div class="article__content">
        <div class="article__content__field m--t--s">
          <div class="article__content__field__label">Location:</div>
          <div class="article__content__field__value">Bengaluru, Karnataka</div>
        </div>
        <div class="article__content__field m--t--s">
          <div class="article__content__field__label">Job Number:</div>
          <div class="article__content__field__value">191310</div>
        </div>
      </div>
    </article>
    <article class="article article--result">
      <div class="article__header">
        <div class="article__header__text">
          <h5 class="article__header__text__subtitle">Koch</h5>
          <h3 class="article__header__text__title article__header__text__title--7">
            <a href="https://koch.avature.net/en_US/careers/JobDetail/HR-Business-Partner/191242">
              HR Business Partner
            </a>
          </h3>
        </div>
      </div>
      <div class="article__content">
        <div class="article__content__field m--t--s">
          <div class="article__content__field__label">Location:</div>
          <div class="article__content__field__value">Bengaluru, Karnataka</div>
        </div>
        <div class="article__content__field m--t--s">
          <div class="article__content__field__label">Job Number:</div>
          <div class="article__content__field__value">191242</div>
        </div>
      </div>
    </article>
    <article class="article article--result">
      <div class="article__header">
        <div class="article__header__text">
          <h5 class="article__header__text__subtitle">Koch</h5>
          <h3 class="article__header__text__title article__header__text__title--7">
            <a href="https://koch.avature.net/en_US/careers/JobDetail/Shanghai-China-Database-Administrator/191304">
              Database Administrator
            </a>
          </h3>
        </div>
      </div>
      <div class="article__content">
        <div class="article__content__field m--t--s">
          <div class="article__content__field__label">Location:</div>
          <div class="article__content__field__value">Shanghai, Shanghai</div>
        </div>
        <div class="article__content__field m--t--s">
          <div class="article__content__field__label">Job Number:</div>
          <div class="article__content__field__value">191304</div>
        </div>
      </div>
    </article>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../kochbusinesssolutions/script.js')
  } catch {
    assert.fail('Expected Koch Business Solutions scraper module at ../kochbusinesssolutions/script.js')
  }
}

test('Koch Business Solutions helpers stay pinned to the official careers page and current Avature result-card structure', async () => {
  const koch = await loadModule()

  assert.equal(koch.SOURCE, 'kochbusinesssolutions')
  assert.equal(koch.COMPANY, 'Koch Business Solutions')
  assert.equal(koch.CAREERS_URL, 'https://www.kochinc.com/career-opportunities/koch')
  assert.equal(
    koch.SEARCH_JOBS_URL,
    'https://koch.avature.net/en_US/careers/SearchJobs?732=26082375&tags=rm.kcm.web.kcm-004',
  )
  assert.equal(koch.hasOfficialCareersSignal(CAREERS_HTML), true)
  assert.deepEqual(
    koch.extractJobsFromSearchHtml(SEARCH_HTML),
    [
      {
        title: 'SAP Delivery Manager',
        location: 'Bengaluru, Karnataka',
        sourceUrl: 'https://koch.avature.net/en_US/careers/JobDetail/Delivery-Manager-SAP/191310',
        applyUrl: 'https://koch.avature.net/en_US/careers/JobDetail/Delivery-Manager-SAP/191310',
      },
      {
        title: 'HR Business Partner',
        location: 'Bengaluru, Karnataka',
        sourceUrl: 'https://koch.avature.net/en_US/careers/JobDetail/HR-Business-Partner/191242',
        applyUrl: 'https://koch.avature.net/en_US/careers/JobDetail/HR-Business-Partner/191242',
      },
    ],
  )
})

test('Koch Business Solutions run validates the official careers page and returns India roles from current Avature cards', async () => {
  const koch = await loadModule()
  const requestedUrls = []

  const jobs = await koch.run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === koch.CAREERS_URL) return CAREERS_HTML
      if (url === koch.SEARCH_JOBS_URL) return SEARCH_HTML

      throw new Error(`Unexpected Koch Business Solutions URL: ${url}`)
    },
    now: () => FIXED_SCRAPED_AT,
  })

  assert.deepEqual(requestedUrls, [
    koch.CAREERS_URL,
    koch.SEARCH_JOBS_URL,
  ])
  assert.deepEqual(
    jobs,
    [
      {
        title: 'SAP Delivery Manager',
        location: 'Bengaluru, Karnataka',
        sourceUrl: 'https://koch.avature.net/en_US/careers/JobDetail/Delivery-Manager-SAP/191310',
        applyUrl: 'https://koch.avature.net/en_US/careers/JobDetail/Delivery-Manager-SAP/191310',
        company: 'Koch Business Solutions',
        country: 'India',
        link: 'https://koch.avature.net/en_US/careers/JobDetail/Delivery-Manager-SAP/191310',
        source: 'kochbusinesssolutions',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        title: 'HR Business Partner',
        location: 'Bengaluru, Karnataka',
        sourceUrl: 'https://koch.avature.net/en_US/careers/JobDetail/HR-Business-Partner/191242',
        applyUrl: 'https://koch.avature.net/en_US/careers/JobDetail/HR-Business-Partner/191242',
        company: 'Koch Business Solutions',
        country: 'India',
        link: 'https://koch.avature.net/en_US/careers/JobDetail/HR-Business-Partner/191242',
        source: 'kochbusinesssolutions',
        scrapedAt: FIXED_SCRAPED_AT,
      },
    ],
  )
})

test('Koch Business Solutions fails closed when the careers page or filtered Avature results drift', async () => {
  const koch = await loadModule()

  await assert.rejects(
    koch.run({
      fetchText: async (url) => {
        if (url === koch.CAREERS_URL) return '<html><body><h1>Unexpected</h1></body></html>'
        return SEARCH_HTML
      },
    }),
    /careers page changed materially/i,
  )

  await assert.rejects(
    koch.run({
      fetchText: async (url) => {
        if (url === koch.CAREERS_URL) return CAREERS_HTML
        return '<html><body><article class="article article--result"><h3>No India jobs here</h3></article></body></html>'
      },
    }),
    /no longer exposes trusted India jobs/i,
  )
})
