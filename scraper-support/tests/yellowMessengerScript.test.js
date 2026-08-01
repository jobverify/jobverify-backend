import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Shape the future of conversations</h1>
      <p>We are transforming how humans connect and converse with brands around the world using next-gen AI solutions.</p>
      <h2>Life at Yellow.ai.</h2>
      <h2>The Yellow Code.</h2>
      <p>Where culture meets purpose.</p>
      <a href="#we-re-hiring">Explore open positions</a>
      <p>Chief Executive Officer and Co-founder, Yellow.ai</p>
    </main>
  </body>
</html>
`

const VERIFIED_ZOHO_PORTAL_TEXT = `
HOME JOBS
Find the career of your dreams
Current Openings
GTM recruiter Position filled
Powered by
`

const CLOSED_PAYLOAD = {
  code: 'success',
  data: [
    {
      Posting_Title: 'GTM recruiter',
      Is_Locked: true,
      Publish: false,
      Keep_on_Career_Site: true,
      City: 'Bangalore South',
      State: 'Karnataka',
      Country: 'India',
      Job_Type: 'Full time',
      Job_Description: 'About Yellow.ai We are a global leader in Conversational AI.',
      Date_Opened: '04/02/2025',
      $url: 'https://yellow.zohorecruit.in/jobs/Careers/157454000000803145/GTM-recruiter?source=CareerSite',
      id: '157454000000803145',
    },
  ],
}

const ACTIVE_PAYLOAD = {
  code: 'success',
  data: [
    {
      ...CLOSED_PAYLOAD.data[0],
      Is_Locked: false,
      Publish: true,
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../../scraper/yellowmessenger/script.js')
  } catch {
    assert.fail('Expected Yellow Messenger workbook scraper module at ../../scraper/yellowmessenger/script.js')
  }
}

test('Yellow Messenger ignores filled Zoho Recruit records and returns [] while no published India jobs remain', async () => {
  const yellowMessenger = await loadModule()

  assert.equal(typeof yellowMessenger.extractIndiaJobs, 'function')
  assert.deepEqual(yellowMessenger.extractIndiaJobs(CLOSED_PAYLOAD), [])
})

test('Yellow Messenger maps published India roles from the verified Zoho Recruit payload', async () => {
  const yellowMessenger = await loadModule()
  const scraper = yellowMessenger.createYellowMessengerScraper({
    now: () => '2026-07-26T00:00:00.000Z',
  })

  const jobs = await scraper.run({
    loadLiveCareersContract: async () => ({
      careersHtml: VERIFIED_CAREERS_HTML,
      boardUrl: 'https://yellow.zohorecruit.in/jobs/Careers',
      boardText: VERIFIED_ZOHO_PORTAL_TEXT,
      payload: ACTIVE_PAYLOAD,
    }),
  })

  assert.deepEqual(jobs, [
    {
      title: 'GTM recruiter',
      company: 'Yellow Messenger',
      department: null,
      location: 'Bangalore South, Karnataka, India',
      city: 'Bangalore South',
      state: 'Karnataka',
      country: 'India',
      jobId: '157454000000803145',
      requisitionId: '157454000000803145',
      sourceUrl: 'https://yellow.zohorecruit.in/jobs/Careers/157454000000803145/GTM-recruiter?source=CareerSite',
      applyUrl: 'https://yellow.zohorecruit.in/jobs/Careers/157454000000803145/GTM-recruiter?source=CareerSite',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '04/02/2025',
      closingDate: null,
      jobDescription: 'About Yellow.ai We are a global leader in Conversational AI.',
      remoteStatus: 'On-site',
      source: 'yellowmessenger',
      link: 'https://yellow.zohorecruit.in/jobs/Careers/157454000000803145/GTM-recruiter?source=CareerSite',
      scrapedAt: '2026-07-26T00:00:00.000Z',
    },
  ])
})
