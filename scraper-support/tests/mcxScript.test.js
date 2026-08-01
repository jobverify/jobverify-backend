import assert from 'node:assert/strict'
import test from 'node:test'

const verifiedCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Work With Us | MCX</title>
  </head>
  <body>
    <main>
      <h1>WORK WITH US</h1>
      <section class="job-opening">
        <h4>Senior Executive - Customer Service &amp; Quality Department</h4>
        <h5>Role</h5>
        <p>Senior Executive - Customer Service &amp; Quality Department</p>
        <h5>Location</h5>
        <p>Mumbai</p>
        <h5>Qualification Profile</h5>
        <ul>
          <li>Any Graduate</li>
        </ul>
        <h5>Experience</h5>
        <p>The candidate should possess at least 3 years of relevant post qualification experience in customer support in Stock or Commodity Exchange / Broking Firms etc.</p>
        <h5>Job Responsibilities</h5>
        <ul>
          <li>To effectively handle queries, calls &amp; e-mails sent by Members.</li>
          <li>Closure of calls with complete resolution adhering to the quality norms of the Exchange.</li>
        </ul>
        <a href="/careers/apply-online">Apply Now</a>
      </section>
      <section class="job-opening">
        <h4>Assistant Manager – Surveillance &amp; Investigation</h4>
        <h5>Role</h5>
        <p>Assistant Manager – Surveillance &amp; Investigation</p>
        <h5>Location</h5>
        <p>Mumbai</p>
        <h5>Qualification Profile</h5>
        <p>MBA (Finance) /CA/ CS with relevant experience</p>
        <h5>Experience</h5>
        <p>Minimum 6 – 8 years of post-qualification experience. Good understanding of financial/ commodity derivatives market and experience in Equity/ Commodity Market</p>
        <h5>Job Responsibilities</h5>
        <ul>
          <li>Good understanding and in-depth knowledge of various derivatives products.</li>
          <li>Preparation of detailed examination/ investigation reports.</li>
        </ul>
        <a href="/careers/apply-online">Apply Now</a>
      </section>
      <footer>
        <p>Please Contact</p>
        <p>careers@mcxindia.com</p>
      </footer>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/mcx/script.js')
  } catch {
    assert.fail('Expected MCX scraper module at ../../scraper/mcx/script.js')
  }
}

test('MCX validates the verified Work With Us surface and extracts current openings', async () => {
  const mcx = await loadModule()

  assert.equal(mcx.HOMEPAGE_URL, 'https://www.mcxindia.com/')
  assert.equal(mcx.CAREERS_URL, 'https://classic.mcxindia.com/careers/workwithus')
  assert.equal(mcx.APPLY_URL, 'https://classic.mcxindia.com/careers/apply-online')
  assert.equal(mcx.hasVerifiedCareersPageSignal(verifiedCareersHtml), true)

  assert.deepEqual(
    mcx.extractJobsFromCareersPage(verifiedCareersHtml),
    [
      {
        title: 'Senior Executive - Customer Service & Quality Department',
        location: 'Mumbai',
        sourceUrl: 'https://classic.mcxindia.com/careers/workwithus',
        applyUrl: 'https://classic.mcxindia.com/careers/apply-online',
        minimumQualification: 'Any Graduate',
        experienceRequired: 'The candidate should possess at least 3 years of relevant post qualification experience in customer support in Stock or Commodity Exchange / Broking Firms etc.',
        jobDescription: [
          'Role: Senior Executive - Customer Service & Quality Department',
          'Location: Mumbai',
          'Qualification Profile: Any Graduate',
          'Experience: The candidate should possess at least 3 years of relevant post qualification experience in customer support in Stock or Commodity Exchange / Broking Firms etc.',
          'Job Responsibilities:',
          '- To effectively handle queries, calls & e-mails sent by Members.',
          '- Closure of calls with complete resolution adhering to the quality norms of the Exchange.',
        ].join('\n'),
      },
      {
        title: 'Assistant Manager – Surveillance & Investigation',
        location: 'Mumbai',
        sourceUrl: 'https://classic.mcxindia.com/careers/workwithus',
        applyUrl: 'https://classic.mcxindia.com/careers/apply-online',
        minimumQualification: 'MBA (Finance) /CA/ CS with relevant experience',
        experienceRequired: 'Minimum 6 – 8 years of post-qualification experience. Good understanding of financial/ commodity derivatives market and experience in Equity/ Commodity Market',
        jobDescription: [
          'Role: Assistant Manager – Surveillance & Investigation',
          'Location: Mumbai',
          'Qualification Profile: MBA (Finance) /CA/ CS with relevant experience',
          'Experience: Minimum 6 – 8 years of post-qualification experience. Good understanding of financial/ commodity derivatives market and experience in Equity/ Commodity Market',
          'Job Responsibilities:',
          '- Good understanding and in-depth knowledge of various derivatives products.',
          '- Preparation of detailed examination/ investigation reports.',
        ].join('\n'),
      },
    ],
  )
})

test('MCX run returns normalized jobs from the verified first-party page', async () => {
  const mcx = await loadModule()
  const jobs = await mcx.createMcxScraper({
    now: () => '2026-07-25T08:30:00.000Z',
  }).run({
    fetchText: async (url) => {
      assert.equal(url, mcx.CAREERS_URL)
      return verifiedCareersHtml
    },
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Senior Executive - Customer Service & Quality Department',
    company: 'MCX',
    department: null,
    location: 'Mumbai, India',
    city: 'Mumbai',
    country: 'India',
    jobId: 'mcx-senior-executive-customer-service-quality-department-mumbai',
    requisitionId: 'mcx-senior-executive-customer-service-quality-department-mumbai',
    sourceUrl: 'https://classic.mcxindia.com/careers/workwithus',
    applyUrl: 'https://classic.mcxindia.com/careers/apply-online',
    employmentType: null,
    workplaceType: null,
    experienceRequired: 'The candidate should possess at least 3 years of relevant post qualification experience in customer support in Stock or Commodity Exchange / Broking Firms etc.',
    minimumQualification: 'Any Graduate',
    preferredQualification: null,
    requiredSkills: [],
    compensation: null,
    postingDate: null,
    closingDate: null,
    jobDescription: [
      'Role: Senior Executive - Customer Service & Quality Department',
      'Location: Mumbai',
      'Qualification Profile: Any Graduate',
      'Experience: The candidate should possess at least 3 years of relevant post qualification experience in customer support in Stock or Commodity Exchange / Broking Firms etc.',
      'Job Responsibilities:',
      '- To effectively handle queries, calls & e-mails sent by Members.',
      '- Closure of calls with complete resolution adhering to the quality norms of the Exchange.',
    ].join('\n'),
    source: 'mcx',
    companyCareerPage: 'https://classic.mcxindia.com/careers/workwithus',
    companyDomain: 'classic.mcxindia.com',
    atsPlatform: 'official-company-careers',
    link: 'https://classic.mcxindia.com/careers/apply-online',
    scrapedAt: '2026-07-25T08:30:00.000Z',
  })
})

test('MCX fails closed if the verified careers page markers disappear', async () => {
  const mcx = await loadModule()

  await assert.rejects(
    mcx.createMcxScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /verified mcx careers surface/i,
  )
})
