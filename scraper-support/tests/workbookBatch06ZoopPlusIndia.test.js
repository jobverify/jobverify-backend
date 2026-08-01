import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_SURFACE_HTML = `
  <html>
    <head>
      <title>Career | Join Our Team</title>
      <meta
        name="description"
        content="Explore career opportunities and join our team."
      />
    </head>
    <body>
      <main>
        <section>
          <h1>About ZOOP</h1>
          <p>
            At ZOOP, we're building smart, secure solutions that make it easier
            for businesses to grow.
          </p>
        </section>
        <section>
          <h2>Why Join Us?</h2>
          <p>Come for the mission, stay for the ownership and growth.</p>
          <p>TEAM &gt; Titles</p>
          <p>A Culture of OWNERSHIP</p>
          <p>Growth with Wellbeing</p>
        </section>
        <section>
          <h2>People at Zoop</h2>
          <p>Join our journey today!</p>
        </section>
      </main>
    </body>
  </html>
`

const loadZoopPlusIndiaModule = async () => {
  try {
    return await import('../../scraper/zoopplusindia/script.js')
  } catch {
    assert.fail(
      'Expected ZoopPlus India scraper module at ../../scraper/zoopplusindia/script.js',
    )
  }
}

test('ZoopPlus India validates the verified ZOOP careers surface before returning []', async () => {
  const zoopPlusIndia = await loadZoopPlusIndiaModule()
  let requestedUrl = null

  const jobs = await zoopPlusIndia.run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, zoopPlusIndia.CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(zoopPlusIndia.SOURCE, 'zoopplusindia')
  assert.equal(zoopPlusIndia.COMPANY, 'ZoopPlus India')
  assert.equal(zoopPlusIndia.OFFICIAL_BRAND, 'ZOOP')
  assert.equal(zoopPlusIndia.CAREERS_URL, 'https://www.zoop.one/career')
  assert.equal(
    zoopPlusIndia.DISPOSITION,
    'verified-official-brand-careers-surface-fail-closed',
  )
  assert.match(
    zoopPlusIndia.VERIFIED_SURFACE_SUMMARY,
    /Verified on Saturday, July 25, 2026/i,
  )
  assert.match(zoopPlusIndia.VERIFIED_SURFACE_SUMMARY, /ZoopPlus India/i)
  assert.match(zoopPlusIndia.VERIFIED_SURFACE_SUMMARY, /\bZOOP\b/i)
  assert.match(
    zoopPlusIndia.VERIFIED_SURFACE_SUMMARY,
    /no trustworthy enumerable public jobs contract/i,
  )
})

test('ZoopPlus India rejects when the verified ZOOP careers surface markers disappear', async () => {
  const zoopPlusIndia = await loadZoopPlusIndiaModule()

  await assert.rejects(
    zoopPlusIndia.run({
      fetchHtml: async () => `
        <html>
          <body>
            <main>
              <h1>Careers</h1>
              <p>Explore opportunities with us.</p>
            </main>
          </body>
        </html>
      `,
    }),
    /verified official brand careers surface changed/i,
  )
})

test('ZoopPlus India rejects when public JobPosting markup appears on the verified page', async () => {
  const zoopPlusIndia = await loadZoopPlusIndiaModule()

  await assert.rejects(
    zoopPlusIndia.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": "Platform Engineer"
          }
        </script>
      `,
    }),
    /JobPosting markup/i,
  )
})

test('ZoopPlus India rejects when a trusted ATS board appears on the verified page', async () => {
  const zoopPlusIndia = await loadZoopPlusIndiaModule()

  await assert.rejects(
    zoopPlusIndia.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="https://boards.greenhouse.io/zoop/jobs/123">Open role</a>
      `,
    }),
    /public jobs surface/i,
  )
})

test('ZoopPlus India rejects when the official ZOOP page starts linking to a same-origin jobs path', async () => {
  const zoopPlusIndia = await loadZoopPlusIndiaModule()

  await assert.rejects(
    zoopPlusIndia.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="/jobs/platform-engineer">Platform Engineer</a>
      `,
    }),
    /public jobs surface/i,
  )
})
