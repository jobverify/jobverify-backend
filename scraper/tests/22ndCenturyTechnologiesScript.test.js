import assert from 'node:assert/strict'
import test from 'node:test'

const contractHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>State of Illinois | 22nd Century Technologies Inc.</title>
  </head>
  <body>
    <main>
      <h1>State of Illinois</h1>
      <p>Central Management Services, State of Illinois has awarded a contract to 22nd Century Technologies, Inc. for its Temporary Staffing Needs.</p>
      <h2>Region 1</h2>
      <table>
        <tr><th>Job Title</th><th>Link to Apply</th></tr>
        <tr>
          <td>Basic Clerical</td>
          <td><a href="https://www.tscti.com/careers/state-il/region-1/basic-clerical">Apply Now</a></td>
        </tr>
        <tr>
          <td>Accounting Assistant</td>
          <td><a href="https://www.tscti.com/careers/state-il/region-1/accounting-assistant">Apply Now</a></td>
        </tr>
      </table>
      <h2>Region 2</h2>
      <table>
        <tr><th>Job Title</th><th>Link to Apply</th></tr>
        <tr>
          <td>Basic Clerical</td>
          <td><a href="https://www.tscti.com/careers/state-il/region-2/basic-clerical">Apply Now</a></td>
        </tr>
      </table>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../22ndcenturytechnologies/script.js')
  } catch {
    assert.fail('Expected 22nd Century Technologies scraper module at ../22ndcenturytechnologies/script.js')
  }
}

test('22nd Century Technologies extracts first-party current openings from the verified contract page', async () => {
  const tscti = await loadModule()

  assert.equal(tscti.hasOfficialCareersSignal(contractHtml), true)
  assert.deepEqual(tscti.extractJobCards(contractHtml), [
    {
      title: 'Basic Clerical',
      department: 'State of Illinois - Region 1',
      location: 'Illinois, United States',
      city: 'Illinois',
      applyUrl: 'https://www.tscti.com/careers/state-il/region-1/basic-clerical',
      jobId: 'state-of-illinois-region-1-basic-clerical',
    },
    {
      title: 'Accounting Assistant',
      department: 'State of Illinois - Region 1',
      location: 'Illinois, United States',
      city: 'Illinois',
      applyUrl: 'https://www.tscti.com/careers/state-il/region-1/accounting-assistant',
      jobId: 'state-of-illinois-region-1-accounting-assistant',
    },
    {
      title: 'Basic Clerical',
      department: 'State of Illinois - Region 2',
      location: 'Illinois, United States',
      city: 'Illinois',
      applyUrl: 'https://www.tscti.com/careers/state-il/region-2/basic-clerical',
      jobId: 'state-of-illinois-region-2-basic-clerical',
    },
  ])

  const jobs = await tscti.create22ndCenturyTechnologiesScraper().run({
    fetchText: async () => contractHtml,
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].country, 'United States')
  assert.equal(jobs[0].source, '22ndcenturytechnologies')
  assert.equal(jobs[2].department, 'State of Illinois - Region 2')
})
