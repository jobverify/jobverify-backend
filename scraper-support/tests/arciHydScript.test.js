import assert from 'node:assert/strict'
import test from 'node:test'

const loadArciHydModule = async () => {
  try {
    return await import('../../scraper/arcihyd/script.js')
  } catch {
    assert.fail('Expected ARCI Hyderabad scraper module at ../../scraper/scraper/arcihyd/script.js')
  }
}

const careersPageHtml = `
  <html>
    <head>
      <title>Careers | International Advanced Research Centre for Powder Metallurgy and New Materials</title>
    </head>
    <body>
      <a href="/careers/vacancies">Vacancies</a>
      <a href="/recruitment-results">Recruitment Results</a>
    </body>
  </html>
`

const vacanciesPageHtml = `
  <html>
    <head>
      <title>Vacancies | International Advanced Research Centre for Powder Metallurgy and New Materials</title>
    </head>
    <body>
      <div class="views-element-container">
        <div class="view view-vacancies view-id-vacancies view-display-id-page_1 js-view-dom-id-12345">
        </div>
      </div>
      <script type="application/json">{"views":{"ajax_path":"\\/views\\/ajax"},"ajaxViews":{"views_dom_id:12345":{"view_name":"vacancies","view_path":"\\/careers\\/vacancies"}}}</script>
    </body>
  </html>
`

test('extractOpenings returns no jobs when the public ARCI vacancies page shows an empty Drupal vacancies view', async () => {
  const arcihyd = await loadArciHydModule()

  assert.equal(arcihyd.hasCareersPageSignal(careersPageHtml), true)
  assert.equal(arcihyd.hasVacanciesPageSignal(vacanciesPageHtml), true)
  assert.equal(arcihyd.hasNoJobsSignal(vacanciesPageHtml), true)
  assert.deepEqual(arcihyd.extractOpenings(vacanciesPageHtml), [])
})

test('run fetches the official ARCI careers pages and returns an honest zero-openings result', async () => {
  const arcihyd = await loadArciHydModule()
  const requestedUrls = []

  const jobs = await arcihyd.createArciHydScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === arcihyd.CAREERS_PAGE_URL) {
        return careersPageHtml
      }

      if (url === arcihyd.VACANCIES_PAGE_URL) {
        return vacanciesPageHtml
      }

      throw new Error(`Unexpected URL ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    arcihyd.CAREERS_PAGE_URL,
    arcihyd.VACANCIES_PAGE_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('run can recover with browser-backed ARCI careers pages when direct requests fail', async () => {
  const arcihyd = await loadArciHydModule()
  const browserUrls = []

  const jobs = await arcihyd.createArciHydScraper().run({
    fetchText: async () => {
      throw new TypeError('fetch failed')
    },
    fetchBrowserText: async (url) => {
      browserUrls.push(url)

      if (url === arcihyd.CAREERS_PAGE_URL) return careersPageHtml
      if (url === arcihyd.VACANCIES_PAGE_URL) return vacanciesPageHtml

      throw new Error(`Unexpected browser URL ${url}`)
    },
  })

  assert.deepEqual(browserUrls, [
    arcihyd.CAREERS_PAGE_URL,
    arcihyd.VACANCIES_PAGE_URL,
  ])
  assert.deepEqual(jobs, [])
})
