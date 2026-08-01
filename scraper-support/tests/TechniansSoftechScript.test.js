import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T00:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Current Job Openings in Gurgaon, Mumbai - Nians</title>
  </head>
  <body>
    <h1>A Part of Focused &amp; Unique Individuals</h1>
    <div>Technology/ IT department (1)</div>
    <div>Web Development (1)</div>
    <div>Technians is now Nians</div>
    <form id="gform_86">
      <label for="input_86_5">Apply For*(Required)</label>
      <select name="input_5" id="input_86_5">
        <option value="">Select Value</option>
        <option value="38">Trainee - Social Media</option>
        <option value="291">Trainee- Creative Strategist</option>
        <option value="501">Web Development Executive</option>
      </select>
    </form>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/technianssoftech/script.js')
  } catch {
    assert.fail('Expected Technians Softech scraper module at ../../scraper/technianssoftech/script.js')
  }
}

test('Technians Softech helpers stay pinned to the verified Nians openings page', async () => {
  const technians = await loadModule()

  assert.equal(technians.SOURCE, 'technianssoftech')
  assert.equal(technians.COMPANY, 'Technians Softech')
  assert.equal(technians.CAREERS_URL, 'https://nians.com/job/')
  assert.equal(technians.VERIFIED_ON, '2026-07-18')
  assert.equal(technians.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(technians.extractRoleOptions(careersHtml), [
    'Trainee - Social Media',
    'Trainee- Creative Strategist',
    'Web Development Executive',
  ])
})

test('Technians Softech run returns normalized openings from the verified designation selector', async () => {
  const technians = await loadModule()
  const jobs = await technians.run({
    fetchText: async (url) => {
      assert.equal(url, technians.CAREERS_URL)
      return careersHtml
    },
    now: () => FIXED_SCRAPED_AT,
  })

  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      source: job.source,
    })),
    [
      {
        title: 'Trainee - Social Media',
        location: 'Gurgaon / Mumbai / Bengaluru, India',
        source: 'technianssoftech',
      },
      {
        title: 'Trainee- Creative Strategist',
        location: 'Gurgaon / Mumbai / Bengaluru, India',
        source: 'technianssoftech',
      },
      {
        title: 'Web Development Executive',
        location: 'Gurgaon / Mumbai / Bengaluru, India',
        source: 'technianssoftech',
      },
    ],
  )
})

test('Technians Softech fails closed when the verified openings selector disappears', async () => {
  const technians = await loadModule()

  await assert.rejects(
    technians.run({
      fetchText: async () => '<html><body><h1>Jobs</h1></body></html>',
    }),
    /verified Nians openings page/i,
  )
})
