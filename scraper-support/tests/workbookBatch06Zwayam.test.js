import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_SURFACE_HTML = `
  <html>
    <body>
      <main>
        <section>
          <h1>Build the Future of Hiring with Zwayam</h1>
          <p>
            At Zwayam, we're revolutionizing recruitment with AI, data, and
            automation. If you're passionate about innovation and solving
            real-world challenges, we want you on our team.
          </p>
          <a href="https://careers.infoedge.com/infoedge/jobslist">Explore Jobs</a>
          <p>
            You will be redirected to Info Edge's Careers page (Zwayam's parent
            company).
          </p>
          <p>opendoors@zwayam.com</p>
        </section>
      </main>
    </body>
  </html>
`

const loadZwayamModule = async () => {
  try {
    return await import('../../scraper/zwayam/script.js')
  } catch {
    assert.fail('Expected Zwayam scraper module at ../../scraper/zwayam/script.js')
  }
}

test('Zwayam validates the verified public careers surface and returns [] while the parent-careers handoff remains non-enumerable', async () => {
  const zwayam = await loadZwayamModule()
  let requestedUrl = null

  const jobs = await zwayam.run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, zwayam.CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(zwayam.SOURCE, 'zwayam')
  assert.equal(zwayam.COMPANY, 'Zwayam')
  assert.equal(zwayam.OFFICIAL_BRAND, 'Zwayam')
  assert.equal(zwayam.CAREERS_URL, 'https://www.zwayam.com/career')
  assert.equal(
    zwayam.DISPOSITION,
    'verified-public-careers-surface-with-info-edge-parent-handoff',
  )
  assert.match(
    zwayam.VERIFIED_SURFACE_SUMMARY,
    /Verified on Saturday, July 25, 2026 that https:\/\/www\.zwayam\.com\/career was the live first-party public careers surface reviewed for Zwayam\./i,
  )
  assert.match(
    zwayam.VERIFIED_SURFACE_SUMMARY,
    /Build the Future of Hiring with Zwayam/i,
  )
  assert.match(
    zwayam.VERIFIED_SURFACE_SUMMARY,
    /You will be redirected to Info Edge(?:'|’)?s Careers page \(Zwayam(?:'|’)?s parent company\)\./i,
  )
  assert.match(
    zwayam.VERIFIED_SURFACE_SUMMARY,
    /returns no jobs until an exact-company public openings flow is verified/i,
  )
})

test('Zwayam rejects when the verified public careers surface markers disappear', async () => {
  const zwayam = await loadZwayamModule()

  await assert.rejects(
    zwayam.run({
      fetchHtml: async () => `
        <html>
          <body>
            <main>
              <h1>Careers</h1>
              <p>Apply to join our team.</p>
            </main>
          </body>
        </html>
      `,
    }),
    /verified public careers surface changed/i,
  )
})

test('Zwayam rejects when the Info Edge parent-careers handoff copy changes', async () => {
  const zwayam = await loadZwayamModule()

  await assert.rejects(
    zwayam.run({
      fetchHtml: async () => `
        <html>
          <body>
            <main>
              <section>
                <h1>Build the Future of Hiring with Zwayam</h1>
                <p>
                  At Zwayam, we're revolutionizing recruitment with AI, data,
                  and automation. If you're passionate about innovation and
                  solving real-world challenges, we want you on our team.
                </p>
                <a href="https://careers.infoedge.com/infoedge/jobslist">Explore Jobs</a>
                <p>Visit our parent company careers portal.</p>
                <p>opendoors@zwayam.com</p>
              </section>
            </main>
          </body>
        </html>
      `,
    }),
    /parent-careers handoff changed/i,
  )
})

test('Zwayam rejects when the first-party careers surface starts exposing a job inventory', async () => {
  const zwayam = await loadZwayamModule()

  await assert.rejects(
    zwayam.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="/career/openings/founding-engineer">Founding Engineer</a>
      `,
    }),
    /public jobs surface/i,
  )
})

test('Zwayam rejects when JobPosting markup appears on the verified careers surface', async () => {
  const zwayam = await loadZwayamModule()

  await assert.rejects(
    zwayam.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"JobPosting","title":"Founding Engineer"}
        </script>
      `,
    }),
    /JobPosting markup/i,
  )
})
