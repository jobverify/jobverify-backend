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
      <fieldset class="region1">
        <legend>Region 1</legend>
        <table class="regionJobs">
          <tr><th>Job Title</th><th>Link to Apply</th></tr>
          <tr>
            <td class="region1">Basic Clerical</td>
            <td class="region1"><a href="mailto:soil@tscti.com?subject=Region-1 / Basic Clerical">Apply Now</a></td>
          </tr>
          <tr>
            <td class="region1">Accounting Assistant</td>
            <td class="region1"><a href="mailto:soil@tscti.com?subject=Region-1 / Accounting Assistant">Apply Now</a></td>
          </tr>
        </table>
      </fieldset>
      <fieldset class="region2">
        <legend>Region 2</legend>
        <table class="regionJobs">
          <tr><th>Job Title</th><th>Link to Apply</th></tr>
          <tr>
            <td class="region2">Basic Clerical</td>
            <td class="region2"><a href="mailto:soil@tscti.com?subject=Region-2 / Basic Clerical">Apply Now</a></td>
          </tr>
        </table>
      </fieldset>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/22ndcenturytechnologies/script.js')
  } catch {
    assert.fail('Expected 22nd Century Technologies scraper module at ../../scraper/22ndcenturytechnologies/script.js')
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
      applyUrl: 'mailto:soil@tscti.com?subject=Region-1%20/%20Basic%20Clerical',
      jobId: 'state-of-illinois-region-1-basic-clerical',
    },
    {
      title: 'Accounting Assistant',
      department: 'State of Illinois - Region 1',
      location: 'Illinois, United States',
      city: 'Illinois',
      applyUrl: 'mailto:soil@tscti.com?subject=Region-1%20/%20Accounting%20Assistant',
      jobId: 'state-of-illinois-region-1-accounting-assistant',
    },
    {
      title: 'Basic Clerical',
      department: 'State of Illinois - Region 2',
      location: 'Illinois, United States',
      city: 'Illinois',
      applyUrl: 'mailto:soil@tscti.com?subject=Region-2%20/%20Basic%20Clerical',
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
