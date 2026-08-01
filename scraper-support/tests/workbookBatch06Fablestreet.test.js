import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_SURFACE_HTML = `
  <html>
    <body>
      <main>
        <h1>About Us</h1>
        <p>How Are We Different</p>
        <p>At Fable Street we design for Indian curves</p>
        <p>You shouldn't have to fit into clothes</p>
        <p>Our Values</p>
        <h2>Find Your Best FIT</h2>
        <a href="https://www.fablestreet.com/">SHOP NOW</a>
        <section>
          <h3>CONTACT US</h3>
          <p>Ph No: 01143078400</p>
          <p>Fable Street Lifestyle Solutions Private Limited, Plot No. 335, Udyog Vihar, Phase IV, Gurugram, Haryana - 122002</p>
          <p>Timings: 09:30 AM to 06:30 PM, Mon to Sat</p>
          <p>For Info/Issues: care@fablestreet.com</p>
          <p>For Jobs: careers@fablestreet.com</p>
        </section>
      </main>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/fablestreet/script.js')
  } catch {
    assert.fail(
      'Expected Fablestreet scraper module at ../../scraper/fablestreet/script.js',
    )
  }
}

test('Fablestreet validates the verified official public surface and returns [] while no trustworthy public jobs contract is verified', async () => {
  const fablestreet = await loadModule()
  let requestedUrl = null

  const jobs = await fablestreet.run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, fablestreet.CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(fablestreet.SOURCE, 'fablestreet')
  assert.equal(fablestreet.COMPANY, 'Fablestreet')
  assert.equal(fablestreet.OFFICIAL_BRAND, 'FableStreet')
  assert.equal(fablestreet.VERIFIED_ON, '2026-07-25')
  assert.equal(fablestreet.CAREERS_URL, 'https://www.fablestreet.com/pages/about-us')
  assert.equal(
    fablestreet.DISPOSITION,
    'verified-exact-name-official-public-surface-with-jobs-email-and-no-enumerable-public-jobs-contract',
  )
  assert.match(
    fablestreet.VERIFIED_SURFACE_SUMMARY,
    /Verified on Saturday, July 25, 2026 that https:\/\/www\.fablestreet\.com\/pages\/about-us was the live exact-name FableStreet official public surface reviewed for workbook company Fablestreet/i,
  )
  assert.match(fablestreet.VERIFIED_SURFACE_SUMMARY, /careers@fablestreet\.com/i)
  assert.match(
    fablestreet.VERIFIED_SURFACE_SUMMARY,
    /no trustworthy enumerable public jobs contract/i,
  )
})

test('Fablestreet rejects when the verified official public surface markers disappear', async () => {
  const fablestreet = await loadModule()

  await assert.rejects(
    fablestreet.run({
      fetchHtml: async () => `
        <html>
          <body>
            <main>
              <h1>Welcome</h1>
              <p>Premium fashion for women.</p>
            </main>
          </body>
        </html>
      `,
    }),
    /verified official public surface changed/i,
  )
})

test('Fablestreet rejects when JobPosting markup appears on the verified public surface', async () => {
  const fablestreet = await loadModule()

  await assert.rejects(
    fablestreet.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"JobPosting","title":"Store Manager"}
        </script>
      `,
    }),
    /JobPosting markup/i,
  )
})

test('Fablestreet rejects when a trusted ATS or LinkedIn public jobs surface appears', async () => {
  const fablestreet = await loadModule()

  await assert.rejects(
    fablestreet.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="https://jobs.lever.co/fablestreet">Open Roles</a>
      `,
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    fablestreet.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="https://www.linkedin.com/company/fablestreet/jobs/">LinkedIn Jobs</a>
      `,
    }),
    /public jobs surface/i,
  )
})

test('Fablestreet rejects when a same-origin jobs path or exact-company hiring copy appears on the verified public surface', async () => {
  const fablestreet = await loadModule()

  await assert.rejects(
    fablestreet.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="/careers/assistant-buyer">Assistant Buyer</a>
      `,
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    fablestreet.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <p>Careers at FableStreet</p>
        <p>Join the FableStreet team.</p>
      `,
    }),
    /public jobs surface|exact-company hiring copy/i,
  )
})
