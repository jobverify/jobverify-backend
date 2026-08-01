import assert from 'node:assert/strict'
import test from 'node:test'

const verifiedCyberArkCareersHtml = `
<!doctype html>
<html>
  <head>
    <title>Careers | CyberArk</title>
  </head>
  <body>
    <h2>Find your opportunity</h2>
    <p>CyberArk is now a Palo Alto Networks company. Check the Palo Alto Networks career site for all opportunities!</p>
    <a href="https://jobs.paloaltonetworks.com/en/">Search All Jobs</a>
  </body>
</html>
`

const verifiedPaloAltoIndiaHtml = `
<!doctype html>
<html>
  <head>
    <title>Explore Cybersecurity Careers and Jobs at Palo Alto Networks India</title>
  </head>
  <body>
    <p>India Location</p>
    <h1>Center of Excellence</h1>
    <p>
      Palo Alto Networks India boasts state-of-the-art technology centers located in Bengaluru,
      Gurgaon, and Pune.
    </p>
    <h2>Latest Jobs in India</h2>
  </body>
</html>
`

const verifiedPaloAltoIndiaSearchHtml = `
<!doctype html>
<html>
  <head>
    <title>Search our Job Opportunities at Palo Alto Networks</title>
  </head>
  <body>
    <p>Job Search Results</p>
    <h1>Define what’s next in cybersecurity.</h1>
    <section>
      <h2>Filtered by</h2>
      <p>Country: India</p>
    </section>
    <section>
      <p>Bengaluru</p>
      <p>Mumbai</p>
      <p>New Delhi</p>
      <p>Pune</p>
    </section>
    <p>Clear All Filters</p>
  </body>
</html>
`

const loadCyberArkIndiaModule = async () => {
  try {
    return await import('../../scraper/cyberarkindia/script.js')
  } catch {
    assert.fail('Expected CyberArk India scraper module at ../../scraper/cyberarkindia/script.js')
  }
}

test('CyberArk India sentinel recognizes the verified CyberArk-to-Palo-Alto careers handoff', async () => {
  const cyberArkIndia = await loadCyberArkIndiaModule()

  assert.equal(cyberArkIndia.SOURCE, 'cyberarkindia')
  assert.equal(cyberArkIndia.COMPANY, 'CyberArk India')
  assert.equal(cyberArkIndia.CYBERARK_CAREERS_URL, 'https://www.cyberark.com/careers/')
  assert.equal(cyberArkIndia.PALO_ALTO_JOBS_HOME_URL, 'https://jobs.paloaltonetworks.com/en/')
  assert.equal(cyberArkIndia.PALO_ALTO_INDIA_URL, 'https://jobs.paloaltonetworks.com/en/india')
  assert.equal(
    cyberArkIndia.PALO_ALTO_INDIA_SEARCH_URL,
    'https://jobs.paloaltonetworks.com/en/search-jobs/?alcpm=1269750&orgIds=47263',
  )
  assert.equal(cyberArkIndia.hasCyberArkCareersHandoffSignal(verifiedCyberArkCareersHtml), true)
  assert.equal(cyberArkIndia.hasPaloAltoIndiaLocationSignal(verifiedPaloAltoIndiaHtml), true)
  assert.equal(cyberArkIndia.hasExpectedIndiaSearchHandoff(verifiedPaloAltoIndiaHtml), false)
  assert.equal(cyberArkIndia.hasPaloAltoIndiaSearchSignal(verifiedPaloAltoIndiaSearchHtml), true)
  assert.equal(cyberArkIndia.hasCyberArkSpecificJobsSignal(verifiedPaloAltoIndiaSearchHtml), false)
  assert.equal(
    cyberArkIndia.hasCyberArkSpecificJobsSignal('<html><body><h1>CyberArk Jobs in India</h1></body></html>'),
    true,
  )
})

test('CyberArk India sentinel returns [] only while the verified official handoff remains unchanged', async () => {
  const cyberArkIndia = await loadCyberArkIndiaModule()
  const requestedUrls = []

  const jobs = await cyberArkIndia.createCyberArkIndiaScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === cyberArkIndia.CYBERARK_CAREERS_URL) {
        return {
          status: 200,
          url,
          headers: {},
          html: verifiedCyberArkCareersHtml,
        }
      }

      if (url === cyberArkIndia.PALO_ALTO_INDIA_URL) {
        return {
          status: 200,
          url,
          headers: {},
          html: verifiedPaloAltoIndiaHtml,
        }
      }

      if (url === cyberArkIndia.PALO_ALTO_INDIA_SEARCH_URL) {
        return {
          status: 200,
          url,
          headers: {},
          html: verifiedPaloAltoIndiaSearchHtml,
        }
      }

      throw new Error(`Unexpected CyberArk India URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    cyberArkIndia.CYBERARK_CAREERS_URL,
    cyberArkIndia.PALO_ALTO_INDIA_URL,
    cyberArkIndia.PALO_ALTO_INDIA_SEARCH_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('CyberArk India sentinel fails closed when the handoff drifts or a CyberArk-specific jobs board appears', async () => {
  const cyberArkIndia = await loadCyberArkIndiaModule()

  await assert.rejects(
    cyberArkIndia.createCyberArkIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === cyberArkIndia.CYBERARK_CAREERS_URL) {
          return { status: 200, url, headers: {}, html: '<html><title>Unexpected</title></html>' }
        }

        return { status: 200, url, headers: {}, html: verifiedPaloAltoIndiaSearchHtml }
      },
    }),
    /verified official cyberark careers surface/i,
  )

  await assert.rejects(
    cyberArkIndia.createCyberArkIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === cyberArkIndia.CYBERARK_CAREERS_URL) {
          return { status: 200, url, headers: {}, html: verifiedCyberArkCareersHtml }
        }

        if (url === cyberArkIndia.PALO_ALTO_INDIA_URL) {
          return { status: 200, url, headers: {}, html: '<html><title>Unexpected</title></html>' }
        }

        return { status: 200, url, headers: {}, html: verifiedPaloAltoIndiaSearchHtml }
      },
    }),
    /verified palo alto networks india location page/i,
  )

  await assert.rejects(
    cyberArkIndia.createCyberArkIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === cyberArkIndia.CYBERARK_CAREERS_URL) {
          return { status: 200, url, headers: {}, html: verifiedCyberArkCareersHtml }
        }

        if (url === cyberArkIndia.PALO_ALTO_INDIA_URL) {
          return { status: 200, url, headers: {}, html: verifiedPaloAltoIndiaHtml }
        }

        return {
          status: 200,
          url,
          headers: {},
          html: verifiedPaloAltoIndiaSearchHtml.replace(
            '</body>',
            '<h2>CyberArk Jobs in India</h2><a href="/en/search-jobs/cyberark-india">View CyberArk jobs</a></body>',
          ),
        }
      },
    }),
    /parent india jobs surface changed materially or now exposes a cyberark-specific public jobs surface/i,
  )
})
