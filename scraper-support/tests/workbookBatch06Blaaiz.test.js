import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_SURFACE_HTML = `
  <html>
    <body>
      <main>
        <h1>About Us</h1>
        <h2>Bridging Hearts, Breaking Barriers.</h2>
        <h3>Vision</h3>
        <p>
          To become Africa's financial infrastructure layer connecting businesses,
          institutions, currencies, and economies across borders.
        </p>
        <h3>Mission</h3>
        <p>
          To provide regulated payments, custody, and settlement infrastructure
          needed to move value across any corridor, in any currency, at institutional
          grade.
        </p>
        <h3>Our Story</h3>
        <h2>Solving Problems Markets Won't Solve</h2>
        <p>Enabling Mobility and Prosperity Through Cross-Border Infrastructure</p>
        <p>
          Blaaiz is a financial powerhouse for cross-border infrastructure,
          operating the systems through which value moves between markets.
        </p>
        <p>support@blaaiz.com</p>
        <p>sales@blaaiz.com</p>
        <a href="https://app.blaaiz.com/auth/create-account">Get Started</a>
        <p>BLAAIZ INNOVATIONS TECHNOLOGY LTD.</p>
      </main>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/blaaiz/script.js')
  } catch {
    assert.fail('Expected Blaaiz scraper module at ../../scraper/blaaiz/script.js')
  }
}

test('Blaaiz validates the verified official public surface and returns [] while no public jobs contract is verified', async () => {
  const blaaiz = await loadModule()
  let requestedUrl = null

  const jobs = await blaaiz.run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, blaaiz.CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(blaaiz.SOURCE, 'blaaiz')
  assert.equal(blaaiz.COMPANY, 'Blaaiz')
  assert.equal(blaaiz.OFFICIAL_BRAND, 'Blaaiz')
  assert.equal(blaaiz.CAREERS_URL, 'https://www.blaaiz.com/about-us')
  assert.equal(
    blaaiz.DISPOSITION,
    'verified-exact-name-official-public-surface-with-no-trustworthy-jobs-contract',
  )
  assert.match(
    blaaiz.VERIFIED_SURFACE_SUMMARY,
    /Verified on Saturday, July 25, 2026 that https:\/\/www\.blaaiz\.com\/about-us was the live exact-name Blaaiz official public surface/i,
  )
  assert.match(
    blaaiz.VERIFIED_SURFACE_SUMMARY,
    /no trustworthy exact-company careers page/i,
  )
  assert.match(
    blaaiz.VERIFIED_SURFACE_SUMMARY,
    /no trustworthy enumerable public jobs contract/i,
  )
})

test('Blaaiz rejects when the verified official public surface markers disappear', async () => {
  const blaaiz = await loadModule()

  await assert.rejects(
    blaaiz.run({
      fetchHtml: async () => `
        <html>
          <body>
            <main>
              <h1>Welcome</h1>
              <p>Payments for everyone.</p>
            </main>
          </body>
        </html>
      `,
    }),
    /verified official public surface changed/i,
  )
})

test('Blaaiz rejects when JobPosting markup appears on the verified public surface', async () => {
  const blaaiz = await loadModule()

  await assert.rejects(
    blaaiz.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"JobPosting","title":"Backend Engineer"}
        </script>
      `,
    }),
    /JobPosting markup/i,
  )
})

test('Blaaiz rejects when a trusted ATS or public LinkedIn jobs surface appears', async () => {
  const blaaiz = await loadModule()

  await assert.rejects(
    blaaiz.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="https://jobs.lever.co/blaaiz/backend-engineer">Backend Engineer</a>
      `,
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    blaaiz.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="https://www.linkedin.com/company/blaaiz/jobs/">LinkedIn Jobs</a>
      `,
    }),
    /public jobs surface/i,
  )
})

test('Blaaiz rejects when a same-origin jobs path appears on the verified public surface', async () => {
  const blaaiz = await loadModule()

  await assert.rejects(
    blaaiz.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="/careers/founding-engineer">Founding Engineer</a>
      `,
    }),
    /public jobs surface/i,
  )
})
