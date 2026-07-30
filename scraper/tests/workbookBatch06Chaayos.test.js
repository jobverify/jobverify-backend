import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_SURFACE_HTML = `
  <html>
    <head>
      <title>careers - Chaayos</title>
    </head>
    <body>
      <main>
        <h2>Our Mission</h2>
        <p>
          Our mission is to help ease these seemingly endless pressures of modern
          existence using a traditional recipe for Relaxation i.e. Chai and Snacks
          that go along with it.
        </p>
        <p>
          Sunshine Teahouse Private Limited known as 'Chaayos' was formed with
          the vision to create a unique tea experience for the consumers of India.
        </p>
        <p>Share resume on hr@chaayos.com</p>
        <a href="https://chaayos.com/pages/our-story">Our Story</a>
      </main>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../workbookbatch06/chaayos.js')
  } catch {
    assert.fail('Expected Chaayos scraper module at ../workbookbatch06/chaayos.js')
  }
}

test('Chaayos validates the verified official careers surface and returns [] while no public jobs contract is verified', async () => {
  const chaayos = await loadModule()
  let requestedUrl = null

  const jobs = await chaayos.run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, chaayos.CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(chaayos.SOURCE, 'chaayos')
  assert.equal(chaayos.COMPANY, 'Chaayos')
  assert.equal(chaayos.OFFICIAL_BRAND, 'Chaayos')
  assert.equal(chaayos.VERIFIED_ON, '2026-07-25')
  assert.equal(chaayos.CAREERS_URL, 'https://chaayos.com/pages/careers')
  assert.equal(chaayos.RESUME_EMAIL, 'hr@chaayos.com')
  assert.equal(
    chaayos.DISPOSITION,
    'verified-exact-name-official-careers-page-with-resume-email-and-no-enumerable-public-jobs-contract',
  )
  assert.match(
    chaayos.VERIFIED_SURFACE_SUMMARY,
    /Verified on Saturday, July 25, 2026 that https:\/\/chaayos\.com\/pages\/careers was the live exact-name Chaayos careers surface/i,
  )
  assert.match(chaayos.VERIFIED_SURFACE_SUMMARY, /hr@chaayos\.com/i)
  assert.match(chaayos.VERIFIED_SURFACE_SUMMARY, /no trustworthy enumerable public jobs contract/i)
})

test('Chaayos rejects when the verified official careers surface markers disappear', async () => {
  const chaayos = await loadModule()

  await assert.rejects(
    chaayos.run({
      fetchHtml: async () => `
        <html>
          <body>
            <main>
              <h1>Careers</h1>
              <p>Join our team.</p>
            </main>
          </body>
        </html>
      `,
    }),
    /verified official careers surface changed/i,
  )
})

test('Chaayos rejects when JobPosting markup appears on the verified careers surface', async () => {
  const chaayos = await loadModule()

  await assert.rejects(
    chaayos.run({
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

test('Chaayos rejects when a trusted ATS or public LinkedIn jobs surface appears', async () => {
  const chaayos = await loadModule()

  await assert.rejects(
    chaayos.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="https://jobs.lever.co/chaayos/store-manager">Store Manager</a>
      `,
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    chaayos.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="https://www.linkedin.com/company/chaayos/jobs/">LinkedIn Jobs</a>
      `,
    }),
    /public jobs surface/i,
  )
})

test('Chaayos rejects when a same-origin jobs path appears on the verified careers surface', async () => {
  const chaayos = await loadModule()

  await assert.rejects(
    chaayos.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="/careers/store-manager">Store Manager</a>
      `,
    }),
    /public jobs surface/i,
  )
})
