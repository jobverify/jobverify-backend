import assert from 'node:assert/strict'
import test from 'node:test'

const loadScioModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected SCIO Management Solutions scraper module at ./script.js')
  }
}

const careersHtml = `
<!DOCTYPE html>
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

const applyHtml = `
<!DOCTYPE html>
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

test('SCIO sentinel pins the current first-party careers and apply shells', async () => {
  const scio = await loadScioModule()

  assert.equal(scio.SOURCE, 'sciomanagementsolutions')
  assert.equal(scio.COMPANY, 'SCIO Management Solutions')
  assert.equal(scio.CAREERS_URL, 'https://www.scioms.com/careers.php')
  assert.equal(scio.APPLY_URL, 'https://www.scioms.com/apply-now')
  assert.equal(scio.VERIFIED_ON, '2026-08-04')

  assert.equal(scio.hasVerifiedCareersSignal(careersHtml), true)
  assert.equal(scio.hasVerifiedApplyFormSignal(applyHtml), true)
  assert.deepEqual(scio.extractPositionOptions(applyHtml), [])
  assert.equal(scio.hasPublicJobListingsSignal(careersHtml), false)
  assert.equal(scio.hasPublicJobListingsSignal(applyHtml), false)
})

test('SCIO sentinel detects real public job signals once positions are populated', async () => {
  const scio = await loadScioModule()

  const populatedApplyHtml = applyHtml.replace(
    '</select>',
    '<option value="Senior Analyst - RCM">Senior Analyst - RCM</option></select>',
  )

  assert.deepEqual(scio.extractPositionOptions(populatedApplyHtml), ['Senior Analyst - RCM'])
  assert.equal(scio.hasPublicJobListingsSignal(populatedApplyHtml), true)
  assert.equal(scio.hasPublicJobListingsSignal('<div>Job ID: SCIO-101</div>'), true)
})

test('SCIO sentinel returns [] while the verified apply form remains a placeholder, even when direct fetch needs browser fallback', async () => {
  const scio = await loadScioModule()
  const requested = []

  const jobs = await scio.createScioManagementSolutionsScraper().run({
    fetchText: async (url) => {
      requested.push(`direct:${url}`)
      throw new Error('fetch failed | Response does not match the HTTP/1.1 protocol (Invalid header value char)')
    },
    fetchBrowserText: async (url) => {
      requested.push(`browser:${url}`)
      if (url === scio.CAREERS_URL) return careersHtml
      if (url === scio.APPLY_URL) return applyHtml
      throw new Error(`Unexpected browser URL: ${url}`)
    },
  })

  assert.deepEqual(requested, [
    `direct:${scio.CAREERS_URL}`,
    `browser:${scio.CAREERS_URL}`,
    `direct:${scio.APPLY_URL}`,
    `browser:${scio.APPLY_URL}`,
  ])
  assert.deepEqual(jobs, [])
})

test('SCIO sentinel fails closed when the verified shell drifts or positions appear', async () => {
  const scio = await loadScioModule()

  await assert.rejects(
    scio.createScioManagementSolutionsScraper().run({
      fetchText: async (url) => {
        if (url === scio.CAREERS_URL) {
          return '<html><body><h1>SCIO Careers</h1></body></html>'
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified SCIO Management Solutions careers shell/i,
  )

  await assert.rejects(
    scio.createScioManagementSolutionsScraper().run({
      fetchText: async (url) => {
        if (url === scio.CAREERS_URL) return careersHtml
        if (url === scio.APPLY_URL) {
          return applyHtml.replace(
            '</select>',
            '<option value="Associate, Coding">Associate, Coding</option></select>',
          )
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /exposes public positions/i,
  )
})
