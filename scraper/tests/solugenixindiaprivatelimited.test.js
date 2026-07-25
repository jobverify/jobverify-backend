import assert from 'node:assert/strict'
import test from 'node:test'

const loadCatalog = async () => {
  try {
    return await import('../solugenixindiaprivatelimited/catalog.js')
  } catch {
    assert.fail('Expected Solugenix India Private Limited catalog module at ../solugenixindiaprivatelimited/catalog.js')
  }
}

const loadScript = async () => {
  try {
    return await import('../solugenixindiaprivatelimited/script.js')
  } catch {
    assert.fail('Expected Solugenix India Private Limited scraper module at ../solugenixindiaprivatelimited/script.js')
  }
}

const careersLandingHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Solugenix Careers</title>
  </head>
  <body>
    <h1>Ready for the next stage of your career?</h1>
    <a href="https://www.solugenix.com/jobs">All Openings</a>
    <a href="https://careers.solugenix.com/team-referral-india">Refer a Candidate — India</a>
  </body>
</html>
`

const jobsPortalHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs Portal</title>
  </head>
  <body>
    <script
      type="text/javascript"
      src="https://jobsapi.ceipal.com/APISource/widget.js"
      data-ceipal-api-key="RzI5YnRDNlo3OGFmQTVPcVIwcEVaUT09"
      data-ceipal-career-portal-id="Z3RkUkt2OXZJVld2MjFpOVRSTXoxZz09"></script>
    <div id="example-widget-container"></div>
  </body>
</html>
`

const blockedWidgetHtml = `
<!doctype html>
<html>
  <body>
    <div class="jobDesTitle-1 position_title make_n_by_a">N/A</div>
    <span class="location make_n_by_a">N/A</span>
    <div class="jLab-2 profession">APRN</div>
    <a class="apply_with_reg_btn showAtsEasyApply">Easy Apply</a>
  </body>
</html>
`

test('Solugenix catalog records the first-party CEIPAL-backed jobs portal and blocked bot path', async () => {
  const { SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG } = await loadCatalog()

  assert.equal(SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.source, 'solugenixindiaprivatelimited')
  assert.equal(SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.companyName, 'Solugenix India Private Limited')
  assert.equal(SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.companyCareerPage, 'https://www.solugenix.com/jobs')
  assert.equal(SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.ceipalApiKey, 'RzI5YnRDNlo3OGFmQTVPcVIwcEVaUT09')
  assert.equal(SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.ceipalCareerPortalId, 'Z3RkUkt2OXZJVld2MjFpOVRSTXoxZz09')
  assert.equal(SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.atsPlatform, 'official-jobs-page-with-bot-blocked-ceipal-widget')
  assert.equal(SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.verifiedOn, '2026-07-18')
  assert.match(SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.verifiedSurfaceSummary, /ceipal/i)
  assert.match(SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.verifiedSurfaceSummary, /bot access is not allowed/i)
})

test('Solugenix sentinel returns [] only while the first-party CEIPAL widget remains bot-blocked', async () => {
  const solugenix = await loadScript()

  assert.equal(solugenix.hasVerifiedCareersLandingSignal(careersLandingHtml), true)
  assert.equal(solugenix.hasVerifiedJobsPortalSignal(jobsPortalHtml), true)
  assert.equal(solugenix.hasBlockedWidgetSignal(blockedWidgetHtml), true)

  const requests = []
  const jobs = await solugenix.run({
    fetchText: async (url) => {
      requests.push(url)
      if (url === solugenix.CAREERS_LANDING_URL) return careersLandingHtml
      if (url === solugenix.JOBS_PORTAL_URL) return jobsPortalHtml
      if (url === solugenix.CEIPAL_WIDGET_URL) return blockedWidgetHtml
      throw new Error(`Unexpected URL ${url}`)
    },
  })

  assert.deepEqual(requests, [
    solugenix.CAREERS_LANDING_URL,
    solugenix.JOBS_PORTAL_URL,
    solugenix.CEIPAL_WIDGET_URL,
  ])
  assert.deepEqual(jobs, [])

  await assert.rejects(
    solugenix.run({
      fetchText: async (url) => {
        if (url === solugenix.CAREERS_LANDING_URL) return careersLandingHtml
        if (url === solugenix.JOBS_PORTAL_URL) return jobsPortalHtml
        return '<html><body><a class="job-title" href="https://candidateportal.ceipal.com/job/123">Senior Software Engineer</a></body></html>'
      },
    }),
    /trustworthy public job records/i,
  )
})
