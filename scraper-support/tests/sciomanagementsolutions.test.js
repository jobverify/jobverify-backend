import assert from 'node:assert/strict'
import test from 'node:test'

const loadCatalog = async () => {
  try {
    return await import('../../scraper/sciomanagementsolutions/catalog.js')
  } catch {
    assert.fail('Expected SCIO Management Solutions catalog module at ../../scraper/sciomanagementsolutions/catalog.js')
  }
}

const loadScript = async () => {
  try {
    return await import('../../scraper/sciomanagementsolutions/script.js')
  } catch {
    assert.fail('Expected SCIO Management Solutions scraper module at ../../scraper/sciomanagementsolutions/script.js')
  }
}

const verifiedCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>SCIO Management Solutions – Intelligent, Automated RCM Services</title>
  </head>
  <body>
    <nav>
      <a href="careers.php#life-at-scio">Life at SCIO</a>
      <a href="careers.php#Current-Openings">Current Openings</a>
      <a href="careers.php#Growth-Pathways">Growth Pathways</a>
      <a href="careers.php#Recognition">Recognition</a>
    </nav>
    <section id="Current-Openings">
      <h2>Current Openings</h2>
      <ul>
        <li>Roles across Operations</li>
        <li>Tech</li>
        <li>Analytics</li>
      </ul>
    </section>
    <footer>
      <p>SCIO Management Solutions empowers healthcare organizations with data-driven insights and smart analytics.</p>
    </footer>
  </body>
</html>
`

const verifiedApplyHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>SCIO Management Solutions – Intelligent, Automated RCM Services</title>
  </head>
  <body>
    <main>
      <h1>Apply Now</h1>
      <form>
        <select id="position" name="position">
          <option value="">-- Select Position --</option>
        </select>
        <label>Upload Resume (PDF/DOC/DOCX)</label>
        <button type="submit">Submit</button>
      </form>
    </main>
  </body>
</html>
`

test('SCIO catalog captures the verified first-party apply-only careers shell', async () => {
  const { SCIOMS_CATALOG } = await loadCatalog()

  assert.equal(SCIOMS_CATALOG.source, 'sciomanagementsolutions')
  assert.equal(SCIOMS_CATALOG.companyName, 'SCIO Management Solutions')
  assert.equal(SCIOMS_CATALOG.companyCareerPage, 'https://www.scioms.com/careers.php')
  assert.equal(SCIOMS_CATALOG.atsPlatform, 'official-careers-shell-no-public-jobs')
  assert.equal(SCIOMS_CATALOG.countryFilter, 'India')
  assert.equal(SCIOMS_CATALOG.verifiedOn, '2026-08-04')
  assert.match(SCIOMS_CATALOG.verifiedSurfaceSummary, /apply now/i)
  assert.match(SCIOMS_CATALOG.verifiedSurfaceSummary, /no trustworthy public job detail surface/i)
})

test('SCIO sentinel returns [] only while the verified careers page remains apply-only', async () => {
  const scio = await loadScript()

  assert.equal(scio.hasVerifiedCareersSignal(verifiedCareersHtml), true)
  assert.equal(
    scio.hasPublicJobListingsSignal('<section><h2>Current Openings</h2><a href="/job/analyst">Revenue Cycle Analyst</a></section>'),
    true,
  )

  const jobs = await scio.run({
    fetchText: async (url) => {
      if (url === scio.CAREERS_URL) return verifiedCareersHtml
      if (url === scio.APPLY_URL) return verifiedApplyHtml
      assert.fail(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])

  await assert.rejects(
    scio.run({
      fetchText: async (url) => {
        if (url === scio.CAREERS_URL) return verifiedCareersHtml
        if (url === scio.APPLY_URL) {
          return verifiedApplyHtml.replace(
            '</select>',
            '<option value="Revenue Cycle Analyst">Revenue Cycle Analyst</option></select>',
          )
        }
        assert.fail(`Unexpected URL: ${url}`)
      },
    }),
    /public positions/i,
  )
})
