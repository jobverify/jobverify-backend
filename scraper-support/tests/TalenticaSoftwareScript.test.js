import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T00:00:00.000Z'

const jobOpeningsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Openings | Talentica.com</title>
  </head>
  <body>
    <h1>Current Openings</h1>
    <div class="col-12 col-sm-6 col-md-4 col-lg-3 uicard job-card all-skills software-development">
      <div class="height-100 is-md-flex flex-column justify-content-between is-relative">
        <div class="mar-b-4">
          <h6 class="font-size-large font-semibold gray-darker no-margin title">Senior Data Engineer </h6>
        </div>
        <p><b>Experience:</b> 6 to 8 years</p>
        <p class="no-margin-bottom mar-t-4 grad-text">
          <span class="font-size-smaller text-uppercase"> Apply </span>
        </p>
        <a href="https://www.talentica.com/jobdescription/senior-data-engineer/" class="anchor-absolute" aria-label="View Details"></a>
      </div>
    </div>
    <div class="col-12 col-sm-6 col-md-4 col-lg-3 uicard job-card all-skills quality-assurance">
      <div class="height-100 is-md-flex flex-column justify-content-between is-relative">
        <div class="mar-b-4">
          <h6 class="font-size-large font-semibold gray-darker no-margin title">QA LLM Engineer </h6>
        </div>
        <p><b>Experience:</b> 3.5 to 5.5 years</p>
        <p class="no-margin-bottom mar-t-4 grad-text">
          <span class="font-size-smaller text-uppercase"> Apply </span>
        </p>
        <a href="https://www.talentica.com/jobdescription/qa-llm-engineer/" class="anchor-absolute" aria-label="View Details"></a>
      </div>
    </div>
    <div class="col-12 col-sm-6 col-md-4 col-lg-3 uicard job-card all-skills software-development">
      <div class="height-100 is-md-flex flex-column justify-content-between is-relative">
        <div class="mar-b-4">
          <h6 class="font-size-large font-semibold gray-darker no-margin title">Software Developer- Golang </h6>
        </div>
        <p><b>Experience:</b> 4-8 years</p>
        <p class="no-margin-bottom mar-t-4 grad-text">
          <span class="font-size-smaller text-uppercase"> Apply </span>
        </p>
        <a href="https://www.talentica.com/jobdescription/software-developer-golang/" class="anchor-absolute" aria-label="View Details"></a>
      </div>
    </div>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/talenticasoftware/script.js')
  } catch {
    assert.fail('Expected Talentica Software scraper module at ../../scraper/talenticasoftware/script.js')
  }
}

test('Talentica Software helpers stay pinned to the verified first-party job grid', async () => {
  const talentica = await loadModule()

  assert.equal(talentica.SOURCE, 'talenticasoftware')
  assert.equal(talentica.COMPANY, 'Talentica Software')
  assert.equal(talentica.CAREERS_URL, 'https://www.talentica.com/job-openings/')
  assert.equal(talentica.hasOfficialCareersSignal(jobOpeningsHtml), true)
  assert.equal(talentica.hasOfficialCareersSignal('<html><body><h1>Talentica</h1></body></html>'), false)
  assert.deepEqual(talentica.extractJobCards(jobOpeningsHtml), [
    {
      title: 'Senior Data Engineer',
      experience: '6 to 8 years',
      location: null,
      sourceUrl: 'https://www.talentica.com/jobdescription/senior-data-engineer/',
      applyUrl: 'https://www.talentica.com/jobdescription/senior-data-engineer/',
    },
    {
      title: 'QA LLM Engineer',
      experience: '3.5 to 5.5 years',
      location: null,
      sourceUrl: 'https://www.talentica.com/jobdescription/qa-llm-engineer/',
      applyUrl: 'https://www.talentica.com/jobdescription/qa-llm-engineer/',
    },
    {
      title: 'Software Developer- Golang',
      experience: '4-8 years',
      location: null,
      sourceUrl: 'https://www.talentica.com/jobdescription/software-developer-golang/',
      applyUrl: 'https://www.talentica.com/jobdescription/software-developer-golang/',
    },
  ])
})

test('Talentica Software run extracts the verified first-party openings', async () => {
  const talentica = await loadModule()

  const jobs = await talentica.run({
    fetchText: async (url) => {
      assert.equal(url, talentica.CAREERS_URL)
      return jobOpeningsHtml
    },
    now: () => FIXED_SCRAPED_AT,
  })

  assert.equal(jobs.length, 3)
  assert.deepEqual(jobs[0], {
    title: 'Senior Data Engineer',
    experience: '6 to 8 years',
    location: null,
    sourceUrl: 'https://www.talentica.com/jobdescription/senior-data-engineer/',
    applyUrl: 'https://www.talentica.com/jobdescription/senior-data-engineer/',
    company: 'Talentica Software',
    country: 'India',
    link: 'https://www.talentica.com/jobdescription/senior-data-engineer/',
    source: 'talenticasoftware',
    scrapedAt: FIXED_SCRAPED_AT,
  })
})

test('Talentica Software run fails closed when the verified first-party page drifts', async () => {
  const talentica = await loadModule()

  await assert.rejects(
    talentica.run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /Talentica verified first-party job openings page changed materially/i,
  )
})
