import assert from 'node:assert/strict'
import test from 'node:test'

const loadIndiagoldModule = async () => {
  try {
    return await import('../indiagold/script.js')
  } catch {
    assert.fail('Expected Indiagold scraper module at ../indiagold/script.js')
  }
}

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>indiagold - Join Us</title>
  </head>
  <body>
    <main>
      <section>
        <h1>India Gold Careers - Let's Grow Together</h1>
        <button>SEE ALL POSITIONS</button>
        <div id="seeAllPosition">Open Opportunities</div>
        <p>Write to us at careers@indiagold.co if you don't find an opportunity that excites you here.</p>
      </section>
    </main>
  </body>
</html>
`

const apiPayload = {
  code: 'success',
  data: [
    {
      id: '610000000001234001',
      Posting_Title: 'Senior DevOps Engineer',
      City: 'Gurugram',
      State: 'Haryana',
      Country: 'India',
      Industry: 'Engineering',
      Job_Type: 'Full time',
      Work_Experience: '5-8 years',
      Required_Skills: 'CI/CD, AWS, Terraform',
      Date_Opened: '2026-07-15',
      Publish: true,
      Is_Locked: false,
      Job_Description: 'Own CI/CD and cloud automation for the lending platform.',
      $url: 'https://indiagold.zohorecruit.in/jobs/Careers/610000000001234001/Senior-DevOps-Engineer?source=CareerSite',
    },
    {
      id: '610000000001234002',
      Posting_Title: 'Growth Analyst',
      City: 'Mumbai',
      State: 'Maharashtra',
      Country: 'India',
      Industry: 'Growth',
      Job_Type: 'Full time',
      Publish: false,
      Is_Locked: false,
      $url: 'https://indiagold.zohorecruit.in/jobs/Careers/610000000001234002/Growth-Analyst?source=CareerSite',
    },
    {
      id: '610000000001234003',
      Posting_Title: 'UAE Credit Ops',
      City: 'Dubai',
      Country: 'United Arab Emirates',
      Publish: true,
      Is_Locked: false,
      $url: 'https://indiagold.zohorecruit.in/jobs/Careers/610000000001234003/UAE-Credit-Ops?source=CareerSite',
    },
    {
      id: '610000000001234004',
      Posting_Title: 'Talent Partner',
      City: 'Bengaluru',
      State: 'Karnataka',
      Country: 'India',
      Industry: 'People',
      Publish: true,
      Is_Locked: true,
      $url: 'https://indiagold.zohorecruit.in/jobs/Careers/610000000001234004/Talent-Partner?source=CareerSite',
    },
  ],
}

test('Indiagold pins the verified careers page and normalizes published India Zoho Recruit openings', async () => {
  const indiagold = await loadIndiagoldModule()

  assert.equal(indiagold.SOURCE, 'indiagold')
  assert.equal(indiagold.COMPANY, 'Indiagold')
  assert.equal(indiagold.VERIFIED_ON, '2026-07-16')
  assert.equal(indiagold.CAREERS_PAGE_URL, 'https://indiagold.co/join-us')
  assert.equal(
    indiagold.CAREERS_API_URL,
    'https://indiagold.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite&extra_fields=%5B%22State%22%2C%22Salary%22%2C%22Industry%22%5D',
  )
  assert.equal(indiagold.hasOfficialCareersPageSignal(officialCareersHtml), true)

  assert.deepEqual(indiagold.extractIndiaJobs(apiPayload), [
    {
      title: 'Senior DevOps Engineer',
      company: 'Indiagold',
      department: 'Engineering',
      location: 'Gurugram, Haryana, India',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      jobId: '610000000001234001',
      requisitionId: '610000000001234001',
      sourceUrl: 'https://indiagold.zohorecruit.in/jobs/Careers/610000000001234001/Senior-DevOps-Engineer?source=CareerSite',
      applyUrl: 'https://indiagold.zohorecruit.in/jobs/Careers/610000000001234001/Senior-DevOps-Engineer?source=CareerSite',
      employmentType: 'Full-time',
      experienceRequired: '5-8 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['CI/CD', 'AWS', 'Terraform'],
      postingDate: '2026-07-15',
      closingDate: null,
      jobDescription: 'Own CI/CD and cloud automation for the lending platform.',
      remoteStatus: 'On-site',
    },
  ])
})

test('Indiagold run validates the official careers page before mapping the public Zoho Recruit feed', async () => {
  const indiagold = await loadIndiagoldModule()
  const requestedUrls = []

  const jobs = await indiagold.createIndiagoldScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === indiagold.CAREERS_PAGE_URL) return officialCareersHtml

      throw new Error(`Unexpected HTML request: ${url}`)
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)

      if (url === indiagold.CAREERS_API_URL) return apiPayload

      throw new Error(`Unexpected JSON request: ${url}`)
    },
    now: () => '2026-07-16T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    indiagold.CAREERS_PAGE_URL,
    indiagold.CAREERS_API_URL,
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'indiagold')
  assert.equal(
    jobs[0].link,
    'https://indiagold.zohorecruit.in/jobs/Careers/610000000001234001/Senior-DevOps-Engineer?source=CareerSite',
  )
  assert.equal(jobs[0].scrapedAt, '2026-07-16T00:00:00.000Z')
})

test('Indiagold fails closed when the verified careers page or public jobs payload drifts', async () => {
  const indiagold = await loadIndiagoldModule()

  await assert.rejects(
    indiagold.createIndiagoldScraper().run({
      fetchText: async () => '<html><body>Unexpected</body></html>',
      fetchJson: async () => apiPayload,
    }),
    /official indiagold careers page/i,
  )

  await assert.rejects(
    indiagold.createIndiagoldScraper().run({
      fetchText: async () => officialCareersHtml,
      fetchJson: async () => ({ code: 'error', data: [] }),
    }),
    /public jobs api/i,
  )
})
