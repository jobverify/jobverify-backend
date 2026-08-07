import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_SURFACE_HTML = `
  <html lang="en">
    <head>
      <title>BugBase</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="stylesheet" href="/_next/static/css/app.css" />
    </head>
    <body>
      <div id="__next"></div>
      <script src="/_next/static/chunks/main-app.js"></script>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/bugbase/script.js')
  } catch {
    assert.fail('Expected BugBase scraper module at ../../scraper/bugbase/script.js')
  }
}

test('BugBase validates the verified official public surface and returns [] while no public jobs contract is verified', async () => {
  const bugbase = await loadModule()
  let requestedUrl = null

  const jobs = await bugbase.run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, bugbase.CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(bugbase.SOURCE, 'bugbase')
  assert.equal(bugbase.COMPANY, 'BugBase')
  assert.equal(bugbase.OFFICIAL_BRAND, 'BugBase')
  assert.equal(bugbase.CAREERS_URL, 'https://bugbase.ai/companies')
  assert.equal(
    bugbase.DISPOSITION,
    'verified-exact-name-official-public-surface-with-no-trustworthy-jobs-contract',
  )
  assert.match(
    bugbase.VERIFIED_SURFACE_SUMMARY,
    /Verified on Saturday, August 1, 2026 that https:\/\/bugbase\.ai\/companies was the live official BugBase public company surface/i,
  )
  assert.match(
    bugbase.VERIFIED_SURFACE_SUMMARY,
    /no trustworthy exact-company careers page/i,
  )
  assert.match(
    bugbase.VERIFIED_SURFACE_SUMMARY,
    /no trustworthy enumerable public jobs contract/i,
  )
  assert.match(
    bugbase.VERIFIED_SURFACE_SUMMARY,
    /thin exact-company Next\.js shell/i,
  )
})

test('BugBase rejects when the verified official public surface markers disappear', async () => {
  const bugbase = await loadModule()

  await assert.rejects(
    bugbase.run({
      fetchHtml: async () => `
        <html>
          <body>
            <main>
              <h1>Welcome</h1>
              <p>Security platform.</p>
            </main>
          </body>
        </html>
      `,
    }),
    /verified official public surface changed/i,
  )
})

test('BugBase rejects when JobPosting markup appears on the verified public surface', async () => {
  const bugbase = await loadModule()

  await assert.rejects(
    bugbase.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"JobPosting","title":"Security Engineer"}
        </script>
      `,
    }),
    /JobPosting markup/i,
  )
})

test('BugBase rejects when a trusted ATS, LinkedIn jobs page, or public company jobs board appears', async () => {
  const bugbase = await loadModule()

  await assert.rejects(
    bugbase.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="https://jobs.lever.co/bugbase/security-engineer">Security Engineer</a>
      `,
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    bugbase.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="https://www.linkedin.com/company/bugbase/jobs/">BugBase Jobs</a>
      `,
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    bugbase.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="https://wellfound.com/company/bugbase/jobs">Open Roles</a>
      `,
    }),
    /public jobs surface/i,
  )
})

test('BugBase rejects when a same-origin jobs path appears on the verified public surface', async () => {
  const bugbase = await loadModule()

  await assert.rejects(
    bugbase.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="/careers/security-engineer">Security Engineer</a>
      `,
    }),
    /public jobs surface/i,
  )
})
