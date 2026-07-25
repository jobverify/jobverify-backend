import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html>
  <head><title>Join Us | Careers At Mobicule Technologies</title></head>
  <body>
    <h3>Where Innovation Meets Opportunity</h3>
    <a href="https://mobicule.zohorecruit.com/jobs/Careers">Explore opportunities</a>
  </body>
</html>
`

const jobsPayload = {
  code: 'success',
  data: [
    {
      id: '1001',
      Posting_Title: 'Programmer Analyst - Android',
      Job_Opening_Name: 'Programmer Analyst - Android',
      City: 'Mumbai / Pune',
      State: 'Maharashtra',
      Country: 'India',
      Job_Type: 'Full-time',
      Work_Experience: '3-5 years',
      Job_Description: 'Build and ship Android applications.',
      $url: 'https://mobicule.zohorecruit.com/jobs/Careers/1001/programmer-analyst-android',
    },
  ],
}

const loadScriptModule = async () => {
  try {
    return await import('../mobiculetechnologies/script.js')
  } catch {
    assert.fail('Expected Mobicule Technologies scraper module at ../mobiculetechnologies/script.js')
  }
}

test('Mobicule Technologies validates the verified careers page and normalizes India jobs from the public Zoho payload', async () => {
  const mobicule = await loadScriptModule()

  assert.equal(mobicule.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(mobicule.extractIndiaJobs(jobsPayload).length, 1)

  const jobs = await mobicule.run({
    fetchText: async () => careersHtml,
    fetchJson: async () => jobsPayload,
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.deepEqual(jobs, [
    {
      title: 'Programmer Analyst - Android',
      company: 'Mobicule Technologies',
      location: 'Mumbai / Pune, Maharashtra, India',
      city: 'Mumbai / Pune',
      state: 'Maharashtra',
      country: 'India',
      jobId: '1001',
      requisitionId: '1001',
      sourceUrl: 'https://mobicule.zohorecruit.com/jobs/Careers/1001/programmer-analyst-android',
      applyUrl: 'https://mobicule.zohorecruit.com/jobs/Careers/1001/programmer-analyst-android',
      employmentType: 'Full-time',
      experienceRequired: '3-5 years',
      description: 'Build and ship Android applications.',
      link: 'https://mobicule.zohorecruit.com/jobs/Careers/1001/programmer-analyst-android',
      source: 'mobiculetechnologies',
      scrapedAt: '2026-07-18T00:00:00.000Z',
    },
  ])
})
