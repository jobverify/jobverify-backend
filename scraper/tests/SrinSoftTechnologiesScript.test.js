import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T00:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at SrinSoft | Join Our Innovative Team</title>
  </head>
  <body>
    <a href="mailto:tms@srinsofttech.com">tms@srinsofttech.com</a>
    <div class="accordion-item" data-tags="Engineering">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button">Geometry Developer</button>
      </h2>
      <div class="accordion-collapse collapse">
        <div class="accordion-body">
          <p><strong style="color:#ED152F">Location:</strong> Chennai, Pune and Hyderabad </p><br>
          <p><strong style="color:#ED152F">Experience:</strong> 3 to 6 Years </p><br>
          <p><strong style="color:#ED152F">Job Description:</strong><br>
            * Develop and optimize algorithms for geometric modeling using the Open Cascade stack.<br>
            * Translate mathematical concepts into clean, maintainable C++ and C# code.<br>
          </p>
          <a href="#form_sec" class="m-3 btn btn-three" onclick="applyunique('Geometry Developer')">Apply Now</a>
        </div>
      </div>
    </div>
    <div class="accordion-item" data-tags="Engineering">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button">Test Engineer - QA</button>
      </h2>
      <div class="accordion-collapse collapse">
        <div class="accordion-body">
          <p><strong style="color:#ED152F">Location:</strong> Chennai </p><br>
          <p><strong style="color:#ED152F">Experience:</strong> 2 to 4 Years </p><br>
          <p><strong style="color:#ED152F">Job Description:</strong><br>
            * Demonstrated expertise in software testing across both web-based applications and desktop tools.<br>
            * Translate business requirements into detailed test scenarios.<br>
          </p>
          <a href="#form_sec" class="m-3 btn btn-three" onclick="applyunique('Test Engineer - QA')">Apply Now</a>
        </div>
      </div>
    </div>
    <div class="accordion-item" data-tags="IT">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button">IBM Cognos Specialist</button>
      </h2>
      <div class="accordion-collapse collapse">
        <div class="accordion-body">
          <p><strong style="color:#ED152F">Location:</strong> Canada </p><br>
          <p><strong style="color:#ED152F">Experience:</strong> 8-10 Years </p><br>
          <p><strong style="color:#ED152F">Job Description:</strong><br>
            * Build enterprise BI reporting solutions.<br>
          </p>
          <a href="#form_sec" class="m-3 btn btn-three" onclick="applyunique('IBM Cognos Specialist')">Apply Now</a>
        </div>
      </div>
    </div>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../srinsofttechnologies/script.js')
  } catch {
    assert.fail('Expected SrinSoft Technologies scraper module at ../srinsofttechnologies/script.js')
  }
}

test('SrinSoft Technologies helpers stay pinned to the verified first-party career accordion', async () => {
  const srinsoft = await loadModule()

  assert.equal(srinsoft.SOURCE, 'srinsofttechnologies')
  assert.equal(srinsoft.COMPANY, 'SrinSoft Technologies')
  assert.equal(srinsoft.CAREERS_URL, 'https://www.srinsofttech.com/career.html')
  assert.equal(srinsoft.APPLY_FORM_URL, 'https://www.srinsofttech.com/career.html#form_sec')
  assert.equal(srinsoft.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(srinsoft.hasOfficialCareersSignal('<html><body><h1>Unexpected</h1></body></html>'), false)
  assert.deepEqual(srinsoft.extractIndiaAccordionJobs(careersHtml), [
    {
      title: 'Geometry Developer',
      department: 'Engineering',
      location: 'Chennai, Pune and Hyderabad',
      experience: '3 to 6 Years',
      sourceUrl: 'https://www.srinsofttech.com/career.html',
      applyUrl: 'https://www.srinsofttech.com/career.html#form_sec',
      jobDescription:
        'Develop and optimize algorithms for geometric modeling using the Open Cascade stack. Translate mathematical concepts into clean, maintainable C++ and C# code.',
    },
    {
      title: 'Test Engineer - QA',
      department: 'Engineering',
      location: 'Chennai',
      experience: '2 to 4 Years',
      sourceUrl: 'https://www.srinsofttech.com/career.html',
      applyUrl: 'https://www.srinsofttech.com/career.html#form_sec',
      jobDescription:
        'Demonstrated expertise in software testing across both web-based applications and desktop tools. Translate business requirements into detailed test scenarios.',
    },
  ])
})

test('SrinSoft Technologies run extracts only India-facing accordion roles', async () => {
  const srinsoft = await loadModule()

  const jobs = await srinsoft.run({
    fetchText: async (url) => {
      assert.equal(url, srinsoft.CAREERS_URL)
      return careersHtml
    },
    now: () => FIXED_SCRAPED_AT,
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Geometry Developer',
    department: 'Engineering',
    location: 'Chennai, Pune and Hyderabad',
    experience: '3 to 6 Years',
    sourceUrl: 'https://www.srinsofttech.com/career.html',
    applyUrl: 'https://www.srinsofttech.com/career.html#form_sec',
    jobDescription:
      'Develop and optimize algorithms for geometric modeling using the Open Cascade stack. Translate mathematical concepts into clean, maintainable C++ and C# code.',
    company: 'SrinSoft Technologies',
    country: 'India',
    link: 'https://www.srinsofttech.com/career.html#form_sec',
    source: 'srinsofttechnologies',
    scrapedAt: FIXED_SCRAPED_AT,
  })
})

test('SrinSoft Technologies run fails closed when the verified careers accordion disappears', async () => {
  const srinsoft = await loadModule()

  await assert.rejects(
    srinsoft.run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /SrinSoft verified first-party careers page changed materially/i,
  )
})
