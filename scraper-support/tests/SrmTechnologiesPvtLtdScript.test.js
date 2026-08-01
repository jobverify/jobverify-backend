import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>SRM Tech | Global Partner for Digital & Mobility Solutions</title>
  </head>
  <body>
    <h2>Careers With Us</h2>
    <a href="https://careers.srmtech.com/candidateportal">Open Positions</a>
  </body>
</html>
`

const candidatePortalLoginHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>SRM Technologies - Candidate Portal</title>
  </head>
  <body>
    <h1>Candidate Portal</h1>
    <h2>Login</h2>
    <p>Enter the time-based one-time password (TOTP) generated from your Authenticator app to proceed.</p>
    <p>Do not have an account? Create an account</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/srmtechnologiespvtltd/script.js')
  } catch {
    assert.fail('Expected SRM Technologies Pvt.Ltd scraper module at ../../scraper/srmtechnologiespvtltd/script.js')
  }
}

test('SRM Technologies Pvt.Ltd helpers stay pinned to the verified homepage handoff and login-gated candidate portal', async () => {
  const srm = await loadModule()

  assert.equal(srm.hasOfficialHomepageCareersSignal(homepageHtml), true)
  assert.equal(
    srm.isLoginGatedCandidatePortal({
      status: 302,
      headers: {
        location: 'https://careers.srmtech.com/recruit/IAMSecurityError.do?isload=true',
      },
      html: '',
    }),
    true,
  )
  assert.equal(
    srm.isLoginGatedCandidatePortal({
      status: 200,
      headers: {},
      html: candidatePortalLoginHtml,
    }),
    true,
  )
})

test('SRM Technologies Pvt.Ltd run validates the verified login gate and stays fail-closed', async () => {
  const srm = await loadModule()
  const jobs = await srm.createSrmTechnologiesPvtLtdScraper().run({
    fetchPage: async (url) => {
      if (url === srm.CAREERS_URL) {
        return {
          status: 200,
          url,
          headers: {},
          html: homepageHtml,
        }
      }

      if (url === srm.CANDIDATE_PORTAL_URL) {
        return {
          status: 302,
          url,
          headers: {
            location: 'https://careers.srmtech.com/recruit/IAMSecurityError.do?isload=true',
          },
          html: '',
        }
      }

      throw new Error(`Unexpected SRM Technologies URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
})

test('SRM Technologies Pvt.Ltd fails closed when the verified homepage handoff changes materially', async () => {
  const srm = await loadModule()

  await assert.rejects(
    srm.createSrmTechnologiesPvtLtdScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        headers: {},
        html: '<html><body><h1>Unexpected</h1></body></html>',
      }),
    }),
    /verified srm technologies careers homepage/i,
  )
})
