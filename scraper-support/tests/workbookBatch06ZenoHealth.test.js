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
    'verified-public-careers-surface-with-linkedin-openings-handoff',
  )
  assert.match(
    zenohealth.VERIFIED_SURFACE_SUMMARY,
    /Verified on Saturday, July 25, 2026 that https:\/\/corporate\.zeno\.health\/careers was the live first-party public careers surface reviewed for Zeno Health\./i,
  )
  assert.match(
    zenohealth.VERIFIED_SURFACE_SUMMARY,
    /View our LinkedIn page for current openings/i,
  )
  assert.match(
    zenohealth.VERIFIED_SURFACE_SUMMARY,
    /returns no jobs until a trustworthy public openings flow is promoted/i,
  )
})

test('Zeno Health rejects when the verified public careers surface markers disappear', async () => {
  const zenohealth = await loadZenoHealthModule()

  await assert.rejects(
    zenohealth.run({
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

test('Zeno Health rejects when the LinkedIn openings handoff copy changes', async () => {
  const zenohealth = await loadZenoHealthModule()

  await assert.rejects(
    zenohealth.run({
      fetchHtml: async () => `
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
      `,
    }),
    /linkedin openings handoff changed/i,
  )
})

test('Zeno Health rejects when the careers surface starts exposing a first-party jobs inventory', async () => {
  const zenohealth = await loadZenoHealthModule()

  await assert.rejects(
    zenohealth.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="/careers/openings/pharmacist">Pharmacist</a>
      `,
    }),
    /public jobs surface/i,
  )
})

test('Zeno Health rejects when JobPosting markup appears on the verified careers surface', async () => {
  const zenohealth = await loadZenoHealthModule()

  await assert.rejects(
    zenohealth.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"JobPosting","title":"Pharmacist"}
        </script>
      `,
    }),
    /JobPosting markup/i,
  )
})
