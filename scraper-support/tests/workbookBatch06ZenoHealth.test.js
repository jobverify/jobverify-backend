import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_SURFACE_HTML = `
  <html>
    <body>
      <main>
        <section>
          <h1>Vibrant. Energetic. Awesome.</h1>
          <p>
            Helping the world is perhaps the most rewarding way to grow in your
            career and life.
          </p>
          <h2>Meet Our Team</h2>
        </section>
        <section>
          <h2>Work culture at Zeno Health</h2>
          <p>Open, supportive, collaborative.</p>
        </section>
        <section>
          <h2>Join us.</h2>
          <a href="https://in.linkedin.com/company/zeno-health">
            View our LinkedIn page for current openings
          </a>
        </section>
      </main>
    </body>
  </html>
`

const CURRENT_SHELL_HTML = `
  <html>
    <head>
      <title>Zeno Health</title>
      <meta
        name="description"
        content="Zeno Health is a healthcare brand that makes medicines affordable and accessible to all, we are on a journey to educate Indians about the value of generic medicines"
      />
      <meta property="og:url" content="https://zeno.health">
    </head>
    <body>
      <script src="runtime.js"></script>
      <script src="main.js"></script>
    </body>
  </html>
`

const loadZenoHealthModule = async () => {
  try {
    return await import('../../scraper/zenohealth/script.js')
  } catch {
    assert.fail('Expected Zeno Health scraper module at ../../scraper/zenohealth/script.js')
  }
}

test('Zeno Health validates the verified careers surface and returns [] while the public contract remains non-enumerable', async () => {
  const zenohealth = await loadZenoHealthModule()
  let requestedUrl = null

  const jobs = await zenohealth.run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, zenohealth.CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(zenohealth.SOURCE, 'zenohealth')
  assert.equal(zenohealth.COMPANY, 'Zeno Health')
  assert.equal(zenohealth.OFFICIAL_BRAND, 'Zeno Health')
  assert.equal(zenohealth.CAREERS_URL, 'https://corporate.zeno.health/careers')
  assert.equal(
    zenohealth.DISPOSITION,
    'verified-first-party-shell-without-public-openings-flow',
  )
  assert.match(
    zenohealth.VERIFIED_SURFACE_SUMMARY,
    /Verified on Friday, August 14, 2026 that https:\/\/corporate\.zeno\.health\/careers now serves a generic first-party Zeno Health shell/i,
  )
  assert.match(
    zenohealth.VERIFIED_SURFACE_SUMMARY,
    /no longer exposes the earlier careers copy or LinkedIn openings handoff/i,
  )
  assert.match(
    zenohealth.VERIFIED_SURFACE_SUMMARY,
    /returns no jobs until a verifiable openings surface reappears/i,
  )
})

test('Zeno Health accepts the current verified shell and returns []', async () => {
  const zenohealth = await loadZenoHealthModule()

  const jobs = await zenohealth.run({
    fetchHtml: async () => CURRENT_SHELL_HTML,
    fetchBrowserHtml: async () => {
      assert.fail('Browser fallback was not expected for the current verified shell')
    },
  })

  assert.deepEqual(jobs, [])
})

test('Zeno Health rejects when the verified public careers surface markers disappear', async () => {
  const zenohealth = await loadZenoHealthModule()
  const brokenHtml = `
    <html>
      <body>
        <main>
          <h1>Careers</h1>
          <p>Apply to join our team.</p>
        </main>
      </body>
    </html>
  `

  await assert.rejects(
    zenohealth.run({
      fetchHtml: async () => brokenHtml,
      fetchBrowserHtml: async () => brokenHtml,
    }),
    /verified public careers surface changed/i,
  )
})

test('Zeno Health rejects when the LinkedIn openings handoff copy changes', async () => {
  const zenohealth = await loadZenoHealthModule()
  const changedHandoffHtml = `
    <html>
      <body>
        <main>
          <section>
            <p>
              Helping the world is perhaps the most rewarding way to grow in your
              career and life.
            </p>
            <h2>Work culture at Zeno Health</h2>
            <h2>Join us.</h2>
            <a href="https://in.linkedin.com/company/zeno-health">
              Follow us on LinkedIn
            </a>
          </section>
        </main>
      </body>
    </html>
  `

  await assert.rejects(
    zenohealth.run({
      fetchHtml: async () => changedHandoffHtml,
      fetchBrowserHtml: async () => changedHandoffHtml,
    }),
    /linkedin openings handoff changed/i,
  )
})

test('Zeno Health rejects when the careers surface starts exposing a first-party jobs inventory', async () => {
  const zenohealth = await loadZenoHealthModule()
  const publicJobsHtml = `
    ${VERIFIED_SURFACE_HTML}
    <a href="/careers/openings/pharmacist">Pharmacist</a>
  `

  await assert.rejects(
    zenohealth.run({
      fetchHtml: async () => publicJobsHtml,
      fetchBrowserHtml: async () => publicJobsHtml,
    }),
    /public jobs surface/i,
  )
})

test('Zeno Health rejects when JobPosting markup appears on the verified careers surface', async () => {
  const zenohealth = await loadZenoHealthModule()
  const jobPostingHtml = `
    ${VERIFIED_SURFACE_HTML}
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"JobPosting","title":"Pharmacist"}
    </script>
  `

  await assert.rejects(
    zenohealth.run({
      fetchHtml: async () => jobPostingHtml,
      fetchBrowserHtml: async () => jobPostingHtml,
    }),
    /JobPosting markup/i,
  )
})
