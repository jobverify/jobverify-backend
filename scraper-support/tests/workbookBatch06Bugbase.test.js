import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_SURFACE_HTML = `
  <html>
    <body>
      <main>
        <h1>Are You A Corporation?</h1>
        <p>
          BugBase keeps businesses safe by providing an all-in-one platform to perform
          continuous and comprehensive security testing.
        </p>
        <a href="/contact-sales">Join Us</a>
        <a href="/demo">Request Demo</a>
        <h2>Vulnerability Disclosure Program</h2>
        <p>
          Provide bounty hunters across the world a legal channel to report their security
          findings to you a.k.a ISO 29147 Compliance
        </p>
        <h2>Managed Bug Bounty Program</h2>
        <p>
          An active crowdsourced security initiative. We streamline the process by
          filtering bug reports, managing payouts and more so that you can focus on
          resolving bugs.
        </p>
        <h2>Private Bug Bounty Program</h2>
        <p>
          Engage with verified, skilled and elite bounty hunters in our Apollo Community
          for fast-paced pentests and see results in real-time.
        </p>
        <h2>CTF Hosting &amp; Hiring Challenges</h2>
        <p>
          Recruitment of top security engineers is made easy by hosting a competition or
          CTF on the BugBase platform.
        </p>
        <h2>Enterprise Pentesting and VAPT</h2>
        <p>
          Enterprise VAPT done right following OWASP, NIST, NIC, SANS and CERT-In
          guidelines covering all compliance requirements.
        </p>
        <p>San Francisco, CA, USA</p>
        <p>77 High Street, Singapore</p>
        <p>New Delhi, India</p>
        <p>queries@bugbase.ai</p>
      </main>
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
    /Verified on Saturday, July 25, 2026 that https:\/\/bugbase\.ai\/companies was the live official BugBase public company surface/i,
  )
  assert.match(
    bugbase.VERIFIED_SURFACE_SUMMARY,
    /no trustworthy exact-company careers page/i,
  )
  assert.match(
    bugbase.VERIFIED_SURFACE_SUMMARY,
    /no trustworthy enumerable public jobs contract/i,
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
