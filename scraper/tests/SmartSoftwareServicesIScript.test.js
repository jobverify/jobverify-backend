import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html><head><title>Careers — Join Smart Software Services | Smart Software Services</title></head>
<body>
  <p>Build the future with us: QA automation, React/Next.js, Node.js, and UI/UX roles.</p>
  <p>4 Open roles</p>
  <p>QA · FE · BE · Design</p>
  <a href="#open-positions">View open roles</a>
</body></html>
`

const loadModule = async () => {
  try {
    return await import('../smartsoftwareservices/script.js')
  } catch {
    assert.fail('Expected Smart Software Services scraper module at ../smartsoftwareservices/script.js')
  }
}

test('Smart Software Services(I) validator stays pinned to the verified first-party roles summary from Friday, July 17, 2026', async () => {
  const smart = await loadModule()
  assert.equal(smart.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(smart.hasTrustworthyPublicApplySignal(careersHtml), false)
})

test('Smart Software Services(I) run validates the first-party roles summary and stays fail-closed', async () => {
  const smart = await loadModule()
  const jobs = await smart.createSmartSoftwareServicesScraper().run({
    fetchText: async () => careersHtml,
  })

  assert.deepEqual(jobs, [])
})
