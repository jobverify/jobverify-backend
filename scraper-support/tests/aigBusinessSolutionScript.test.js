import assert from 'node:assert/strict'
import test from 'node:test'

const careersShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | AIG Healthcare</title>
  </head>
  <body>
    <main>
      <h2>Join Our Dynamic Team</h2>
      <p>Current Job Openings</p>
      <a href="https://aighealthcare.in/openings">Read More</a>
    </main>
  </body>
</html>
`

const openingsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Openings | AIG Healthcare</title>
  </head>
  <body>
    <section>
      <h2>Openings</h2>
      <h3>Join the rightful revolution, Join AIG Healthcare</h3>
      <p>Welcome to IKS Health</p>
      <a href="https://eiyi.fa.ap1.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_3001">Careers Page</a>
      <div class="opening-card">
        <a href="https://aighealthcare.in/uploads/images/customer-service-representative.pdf">
          Customer Service Representative
        </a>
        <a href="https://aighealthcare.in/uploads/images/customer-service-representative.pdf">Mid level</a>
      </div>
      <div class="opening-card">
        <a href="https://aighealthcare.in/uploads/images/director-clinical-services.pdf">
          Director, Clinical Services
        </a>
        <a href="https://aighealthcare.in/uploads/images/director-clinical-services.pdf">Senior Level</a>
      </div>
    </section>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/aigbusinesssolution/script.js')
  } catch {
    assert.fail('Expected AIG Business Solution scraper module at ../../scraper/aigbusinesssolution/script.js')
  }
}

test('AIG Business Solution keeps the verified careers shell and openings parser pinned', async () => {
  const aig = await loadModule()

  assert.equal(aig.CAREERS_URL, 'https://aighealthcare.in/careers')
  assert.equal(aig.OPENINGS_URL, 'https://aighealthcare.in/openings')
  assert.equal(aig.hasOfficialCareersShellSignal(careersShellHtml), true)
  assert.equal(aig.hasOfficialOpeningsSignal(openingsHtml), true)
  assert.deepEqual(
    aig.extractOpenings(openingsHtml).map((job) => [job.title, job.level, job.applyUrl]),
    [
      [
        'Customer Service Representative',
        'Mid level',
        'https://aighealthcare.in/uploads/images/customer-service-representative.pdf',
      ],
      [
        'Director, Clinical Services',
        'Senior Level',
        'https://aighealthcare.in/uploads/images/director-clinical-services.pdf',
      ],
    ],
  )
})

test('AIG Business Solution run returns the visible same-domain opening links from the verified openings page', async () => {
  const aig = await loadModule()
  const requestedUrls = []

  const jobs = await aig.createAigBusinessSolutionScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === aig.CAREERS_URL) return careersShellHtml
      if (url === aig.OPENINGS_URL) return openingsHtml
      throw new Error(`Unexpected AIG URL: ${url}`)
    },
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [aig.CAREERS_URL, aig.OPENINGS_URL])
  assert.deepEqual(
    jobs.map((job) => [job.title, job.jobDescription, job.applyUrl, job.source]),
    [
      [
        'Customer Service Representative',
        'Level: Mid level',
        'https://aighealthcare.in/uploads/images/customer-service-representative.pdf',
        'aigbusinesssolution',
      ],
      [
        'Director, Clinical Services',
        'Level: Senior Level',
        'https://aighealthcare.in/uploads/images/director-clinical-services.pdf',
        'aigbusinesssolution',
      ],
    ],
  )
})

test('AIG Business Solution fails closed when the verified openings contract drifts', async () => {
  const aig = await loadModule()

  await assert.rejects(
    aig.createAigBusinessSolutionScraper().run({
      fetchText: async (url) => {
        if (url === aig.CAREERS_URL) return careersShellHtml
        return openingsHtml.replace('Welcome to IKS Health', 'Welcome elsewhere')
      },
    }),
    /verified openings page/i,
  )
})
