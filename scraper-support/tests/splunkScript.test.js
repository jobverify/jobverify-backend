import assert from 'node:assert/strict'
import test from 'node:test'

const LEGACY_ENTRY_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Working at Splunk - Cisco Careers</title>
  </head>
  <body>
    <h1>Build a more resilient digital world with us</h1>
    <a href="https://careers.cisco.com/global/en/splunk/search-page">Search jobs</a>
    <link rel="canonical" href="https://careers.cisco.com/global/en/splunk" />
  </body>
</html>
`

const SEARCH_PAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Splunk Job Openings - Cisco Careers</title>
  </head>
  <body>
    <script>
      var phApp = phApp || {};
      phApp.ddo = {
        "eagerLoadRefineSearch":{
          "status":200,
          "hits":59,
          "totalHits":59,
          "data":{
            "jobs":[
              {
                "title":"Splunk Regional Sales Manager",
                "location":"Research Triangle Park, United States",
                "country":"United States of America",
                "jobId":"2010001"
              },
              {
                "title":"Splunk Solutions Engineer Intern",
                "location":"London, United Kingdom",
                "country":"United Kingdom",
                "jobId":"2012855"
              }
            ],
            "aggregations":[
              {"field":"country","value":{"United States of America":31,"United Kingdom":5,"Japan":7}},
              {"field":"type","value":{"Full time":59}}
            ]
          },
          "eid":{
            "query":"(title.title_phenom:(\\"Splunk\\"))"
          }
        },
        "jobwidgetsettings":{"status":"success"}
      };
    </script>
    <div data-widget-type="phw-search-results"></div>
    <div data-rk="l-splunk-search-page"></div>
  </body>
</html>
`

const INDIA_PAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Splunk India Jobs - Cisco Careers</title>
  </head>
  <body>
    <script>
      var phApp = phApp || {};
      phApp.ddo = {
        "eagerLoadRefineSearch":{
          "status":200,
          "hits":0,
          "totalHits":0,
          "data":{
            "jobs":[],
            "aggregations":[
              {"field":"country","value":{"India":0}},
              {"field":"type","value":{}}
            ],
            "ui_selections":{"country":["India"]}
          },
          "eid":{
            "query":"(title.title_phenom:(\\"Splunk\\") AND country.country_sort:(\\"India\\"))"
          }
        },
        "jobwidgetsettings":{"status":"success"}
      };
    </script>
    <div data-widget-type="phw-search-results"></div>
    <div data-rk="l-splunkindia"></div>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/splunk/script.js')
  } catch {
    assert.fail('Expected Splunk scraper module at ../../scraper/splunk/script.js')
  }
}

test('Splunk helpers recognize the verified first-party entry, global search results, and empty India slice', async () => {
  const splunk = await loadModule()

  assert.equal(splunk.SOURCE, 'splunk')
  assert.equal(splunk.COMPANY, 'Splunk')
  assert.equal(splunk.CAREERS_ENTRY_URL, 'https://www.splunk.com/en_us/careers/search-jobs.hml.html')
  assert.equal(splunk.SEARCH_PAGE_URL, 'https://careers.cisco.com/global/en/splunk/search-page')
  assert.equal(splunk.INDIA_PAGE_URL, 'https://careers.cisco.com/global/en/splunk/india')
  assert.equal(splunk.VERIFIED_ON, '2026-07-25')
  assert.equal(splunk.hasLegacyCareersEntrySignal(LEGACY_ENTRY_HTML), true)
  assert.equal(splunk.hasSearchPageSignal(SEARCH_PAGE_HTML), true)
  assert.equal(splunk.hasIndiaPageSignal(INDIA_PAGE_HTML), true)

  const searchState = splunk.extractRefineSearchState(SEARCH_PAGE_HTML)
  const indiaState = splunk.extractRefineSearchState(INDIA_PAGE_HTML)

  assert.equal(searchState.totalHits, 59)
  assert.equal(indiaState.totalHits, 0)
  assert.equal(splunk.searchPageShowsLiveGlobalResults(searchState), true)
  assert.equal(splunk.indiaPageShowsVerifiedEmptySlice(indiaState), true)
})

test('Splunk returns [] only while the verified India page stays empty and the global page stays live', async () => {
  const splunk = await loadModule()
  const requestedUrls = []

  const jobs = await splunk.createSplunkScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === splunk.CAREERS_ENTRY_URL) return LEGACY_ENTRY_HTML
      if (url === splunk.SEARCH_PAGE_URL) return SEARCH_PAGE_HTML
      if (url === splunk.INDIA_PAGE_URL) return INDIA_PAGE_HTML
      throw new Error(`Unexpected Splunk URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    splunk.CAREERS_ENTRY_URL,
    splunk.SEARCH_PAGE_URL,
    splunk.INDIA_PAGE_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Splunk fails closed when the public India slice or global search payload changes materially', async () => {
  const splunk = await loadModule()

  await assert.rejects(
    splunk.createSplunkScraper().run({
      fetchText: async (url) => {
        if (url === splunk.CAREERS_ENTRY_URL) return LEGACY_ENTRY_HTML
        if (url === splunk.SEARCH_PAGE_URL) return SEARCH_PAGE_HTML
        return `
          <html>
            <head><title>Splunk India Jobs - Cisco Careers</title></head>
            <body>
              <script>
                phApp = {
                  ddo: {
                    "eagerLoadRefineSearch":{
                      "status":200,
                      "hits":1,
                      "totalHits":1,
                      "data":{
                        "jobs":[{"title":"Splunk Software Engineer","country":"India"}],
                        "aggregations":[{"field":"country","value":{"India":1}}],
                        "ui_selections":{"country":["India"]}
                      },
                      "eid":{"query":"(title.title_phenom:(\\"Splunk\\") AND country.country_sort:(\\"India\\"))"}
                    },
                    "jobwidgetsettings":{"status":"success"}
                  }
                }
              </script>
              <div data-widget-type="phw-search-results"></div>
              <div data-rk="l-splunkindia"></div>
            </body>
          </html>
        `
      },
    }),
    /India empty slice/i,
  )
})
