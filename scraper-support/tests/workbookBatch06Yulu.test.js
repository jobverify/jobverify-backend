import assert from 'node:assert/strict'
import test from 'node:test'

const yuluModule = await import('../../scraper/yulu/script.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  JOBS_BOARD_URL,
  OFFICIAL_BRAND,
  REQUISITION_LIST_URL,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  createYuluScraper,
  hasExpectedListingsError,
  hasVerifiedCareersSurface,
  run,
} = yuluModule

const VERIFIED_CAREERS_SURFACE_HTML = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Career</title>
    </head>
    <body>
      <main>
        <h1>Redefine Urban Mobility</h1>
        <p>At Yulu, passion meets purpose.</p>
        <h2>Why join us?</h2>
        <h2>Life at Yulu</h2>
        <section>
          <p>Yulu is India’s largest shared EV and BaaS company.</p>
          <button onclick="scrollToDiv()">Explore</button>
          <button onclick="location.href='mailto:career@yulu.bike'">Contact us</button>
        </section>
        <div id="target">
          <script src="https://yulu.mynexthire.com/employer/ui/js/jobboard/careers-integration.js"></script>
          <script>
            document.onreadystatechange = function () {
              if (document.readyState === "complete") {
                mnh_ci_onreadystatechange("careers", "yulu", {});
              }
            };
          </script>
          <iframe id="mnhembedded" src=""></iframe>
        </div>
        <section>
          <h2>Stay in touch!</h2>
          <p>Didn&apos;t find what you are looking for?</p>
          <a href="mailto:career@yulu.bike">career@yulu.bike</a>
        </section>
      </main>
    </body>
  </html>
`

const EXPECTED_LISTINGS_ERROR_MESSAGE =
  'Unable to process your request at this time; please try a little later or contact your administrator!'

test('Yulu stays fail-closed on the verified careers shell and current MyNextHire listing error', async () => {
  let requestedCareersUrl = null

  const jobs = await run({
    fetchHtml: async (url) => {
      requestedCareersUrl = url
      return VERIFIED_CAREERS_SURFACE_HTML
    },
    fetchJson: async (url, options = {}) => {
      assert.equal(url, REQUISITION_LIST_URL)
      assert.equal(options.method, 'POST')
      assert.equal(options.headers['Content-Type'], 'application/json')
      assert.deepEqual(JSON.parse(options.body), {
        source: 'careers',
        code: '',
        filterByBuId: -1,
      })

      return { errorMessage: EXPECTED_LISTINGS_ERROR_MESSAGE }
    },
  })

  assert.equal(requestedCareersUrl, CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(SOURCE, 'yulu')
  assert.equal(COMPANY, 'Yulu')
  assert.equal(OFFICIAL_BRAND, 'Yulu')
  assert.equal(CAREERS_URL, 'https://careers.yulu.bike/')
  assert.equal(JOBS_BOARD_URL, 'https://yulu.mynexthire.com/employer/jobs/careers')
  assert.equal(
    REQUISITION_LIST_URL,
    'https://yulu.mynexthire.com/employer/careers/reqlist/get',
  )
  assert.equal(
    DISPOSITION,
    'verified-first-party-careers-shell-with-mynexthire-handoff-and-public-listing-error-fail-closed',
  )
  assert.match(VERIFIED_SURFACE_SUMMARY, /Saturday, July 25, 2026/)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/careers\.yulu\.bike\//i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/yulu\.mynexthire\.com\/employer\/jobs\/careers/i)
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /Unable to process your request at this time; please try a little later or contact your administrator!/i,
  )
  assert.equal(typeof createYuluScraper, 'function')
  assert.equal(hasVerifiedCareersSurface(VERIFIED_CAREERS_SURFACE_HTML), true)
  assert.equal(
    hasExpectedListingsError({ errorMessage: EXPECTED_LISTINGS_ERROR_MESSAGE }),
    true,
  )
})

test('Yulu rejects when the verified careers shell disappears or the embed contract drifts', async () => {
  assert.equal(
    hasVerifiedCareersSurface(`
      <html>
        <body>
          <h1>Careers</h1>
          <p>Explore opportunities with us.</p>
        </body>
      </html>
    `),
    false,
  )

  await assert.rejects(
    run({
      fetchHtml: async () => `
        <html>
          <body>
            <h1>Careers</h1>
            <p>Explore opportunities with us.</p>
          </body>
        </html>
      `,
      fetchJson: async () => ({ errorMessage: EXPECTED_LISTINGS_ERROR_MESSAGE }),
    }),
    /verified careers shell/i,
  )
})

test('Yulu rejects when the public MyNextHire requisition list starts returning data', async () => {
  await assert.rejects(
    run({
      fetchHtml: async () => VERIFIED_CAREERS_SURFACE_HTML,
      fetchJson: async () => ({
        reqDetailsBOList: [
          {
            reqId: 1142,
            reqTitle: 'Senior Backend Engineer',
          },
        ],
      }),
    }),
    /requisition list now returns data|promote a real parser/i,
  )
})

test('Yulu rejects when the public MyNextHire requisition response changes away from the verified error state', async () => {
  assert.equal(hasExpectedListingsError({ errorMessage: 'Service unavailable' }), false)

  await assert.rejects(
    run({
      fetchHtml: async () => VERIFIED_CAREERS_SURFACE_HTML,
      fetchJson: async () => ({ errorMessage: 'Service unavailable' }),
    }),
    /requisition contract changed materially|unexpected public listing response/i,
  )
})
