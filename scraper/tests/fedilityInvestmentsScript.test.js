import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-15T00:00:00.000Z'
const JOBS_PAGE_URL = 'https://jobs.fidelity.com/in/jobs/'
const JOBS_XML_URL = 'https://jobs.fidelity.com/in/jobs/xml/?rss=true'
const DETAIL_URL = 'https://jobs.fidelity.com/in/jobs/2130684/principal-network-engineer/'

const jobsPageHtml = `
<!doctype html>
<html lang="en-IN">
  <head>
    <title>Search Jobs - Find the right match for your skills and location. | Fidelity Careers</title>
    <link rel="canonical" href="https://jobs.fidelity.com/in/jobs/" />
  </head>
  <body>
    <nav>
      <a href="/in/life-at-fidelity-india/">Life at Fidelity India</a>
      <a href="https://talentcommunity.fidelity.com/">Join our talent network</a>
    </nav>
    <main>
      <h1>Search Jobs</h1>
      <p>Find the right match for your skills and location.</p>
      <label>Location Select Location Bangalore Chennai</label>
      <div>Company registered office in India: Fidelity Business Services India Pvt. Ltd.</div>
    </main>
  </body>
</html>
`

const jobsXml = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<source>
  <publisher>Fidelity Investments Careers</publisher>
  <publisherUrl>https://jobs.fidelity.com</publisherUrl>
  <lastBuildDate>Tue, 14 Jul 2026 21:07:52 GMT</lastBuildDate>
  <job>
    <title><![CDATA[Lead Software Engineer]]></title>
    <date><![CDATA[Tue, 14 Jul 2026 00:00:00 GMT]]></date>
    <requisitionid><![CDATA[2131693]]></requisitionid>
    <referencenumber><![CDATA[2131693]]></referencenumber>
    <apijobid><![CDATA[2131693]]></apijobid>
    <url><![CDATA[https://jobs.fidelity.com/in/jobs/2131693/lead-software-engineer/]]></url>
    <company><![CDATA[Fidelity Investments]]></company>
    <city><![CDATA[Bangalore]]></city>
    <state><![CDATA[Karnātaka]]></state>
    <country><![CDATA[IN]]></country>
    <description><![CDATA[
      <h3>Job Description:</h3>
      <p><strong>Job Title: </strong>Lead – Software Engineering</p>
      <p><strong>The Team</strong></p>
      <p>Fidelity's Workplace Investing Reporting and Analytics chapter is seeking a Senior PowerBI Developer.</p>
      <p><strong>The Expertise You Have</strong></p>
      <ul>
        <li>Bachelor’s Degree in Computer Science / similar technical subject area and or equivalent experience</li>
        <li>5+ years of experience as a Power BI Developer with a strong portfolio of built reports, dashboards, and visualizations.</li>
      </ul>
      <p><strong>The Skills You Bring</strong></p>
      <ul>
        <li>Strong problem solving &amp; collaboration skills</li>
        <li>Excellent communication skills required</li>
      </ul>
      <p><strong>Location</strong>: Bangalore</p>
      <p><strong>Shift timings</strong>: 11:00 am - 8:00pm</p>
    ]]></description>
    <jobtype><![CDATA[Regular]]></jobtype>
    <category><![CDATA[Technology]]></category>
  </job>
  <job>
    <title><![CDATA[Principal Network Engineer]]></title>
    <date><![CDATA[Wed, 24 Jun 2026 00:00:00 GMT]]></date>
    <requisitionid><![CDATA[2130302]]></requisitionid>
    <referencenumber><![CDATA[2130302]]></referencenumber>
    <apijobid><![CDATA[2130302]]></apijobid>
    <url><![CDATA[https://jobs.fidelity.com/in/jobs/2130302/principal-network-engineer/]]></url>
    <company><![CDATA[Fidelity Investments]]></company>
    <city><![CDATA[Bangalore]]></city>
    <state><![CDATA[Karnātaka]]></state>
    <country><![CDATA[IN]]></country>
    <description><![CDATA[
      <h3>Job Description:</h3>
      <p><strong>Job Title</strong> – <strong>Principal Network Engineer</strong></p>
      <p><strong>The Purpose of This Role</strong></p>
      <p>As Principal Network Engineer in the Network Security Engineering team you will be responsible for engineering and management of network security infrastructure for Fidelity Investments globally.</p>
      <p><strong>The Skills that are Key to this role</strong></p>
      <ul>
        <li>Strong knowledge and working experience with Juniper SRX, Check Point and Cisco Firepower security appliances</li>
        <li>Strong knowledge of Cisco Nexus, ASR and Catalyst routing and switching platforms</li>
      </ul>
      <p><strong>Location:</strong> Bangalore</p>
      <p><strong>Shift timings</strong>: 2 PM to 11 PM</p>
    ]]></description>
    <jobtype><![CDATA[Regular]]></jobtype>
    <category><![CDATA[Technology]]></category>
  </job>
  <job>
    <title><![CDATA[Principal Network Engineer]]></title>
    <date><![CDATA[Wed, 24 Jun 2026 00:00:00 GMT]]></date>
    <requisitionid><![CDATA[2130302]]></requisitionid>
    <referencenumber><![CDATA[2130302A]]></referencenumber>
    <apijobid><![CDATA[2130302]]></apijobid>
    <url><![CDATA[https://jobs.fidelity.com/in/jobs/2130302/principal-network-engineer/]]></url>
    <company><![CDATA[Fidelity Investments]]></company>
    <city><![CDATA[Chennai]]></city>
    <state><![CDATA[Tamil Nādu]]></state>
    <country><![CDATA[IN]]></country>
    <description><![CDATA[
      <h3>Job Description:</h3>
      <p><strong>Job Title</strong> – <strong>Principal Network Engineer</strong></p>
      <p><strong>The Purpose of This Role</strong></p>
      <p>As Principal Network Engineer in the Network Security Engineering team you will be responsible for engineering and management of network security infrastructure for Fidelity Investments globally.</p>
      <p><strong>The Skills that are Key to this role</strong></p>
      <ul>
        <li>Strong knowledge and working experience with Juniper SRX, Check Point and Cisco Firepower security appliances</li>
        <li>Strong knowledge of Cisco Nexus, ASR and Catalyst routing and switching platforms</li>
      </ul>
      <p><strong>Location:</strong> Chennai</p>
      <p><strong>Shift timings</strong>: 2 PM to 11 PM</p>
    ]]></description>
    <jobtype><![CDATA[Regular]]></jobtype>
    <category><![CDATA[Technology]]></category>
  </job>
</source>`

const loadModule = async () => {
  try {
    return await import('../fedilityinvestments/script.js')
  } catch {
    assert.fail('Expected Fedility Investments scraper module at ../fedilityinvestments/script.js')
  }
}

test('Fedility Investments helpers stay pinned to the verified Fidelity India jobs page and RSS feed', async () => {
  const fedilityInvestments = await loadModule()

  assert.equal(fedilityInvestments.SOURCE, 'fedilityinvestments')
  assert.equal(fedilityInvestments.COMPANY, 'Fedility Investments')
  assert.equal(fedilityInvestments.OFFICIAL_BRAND_NAME, 'Fidelity Investments')
  assert.equal(fedilityInvestments.VERIFIED_ON, '2026-07-15')
  assert.equal(fedilityInvestments.JOBS_PAGE_URL, JOBS_PAGE_URL)
  assert.equal(fedilityInvestments.JOBS_XML_URL, JOBS_XML_URL)
  assert.equal(
    fedilityInvestments.OFFICIAL_JOB_DETAIL_EXAMPLE_URL,
    DETAIL_URL,
  )
  assert.equal(fedilityInvestments.hasOfficialJobsPageSignal(jobsPageHtml), true)
  assert.equal(fedilityInvestments.hasOfficialJobsFeedSignal(jobsXml), true)
  assert.equal(fedilityInvestments.normalizeEmploymentType('Regular'), 'Full-time')
})

test('extractJobsFromFeed parses the verified Fidelity India XML feed and merges duplicate multi-location roles', async () => {
  const fedilityInvestments = await loadModule()
  const jobs = fedilityInvestments.extractJobsFromFeed(jobsXml)

  assert.equal(jobs.length, 2)

  assert.deepEqual(jobs[0], {
    title: 'Lead Software Engineer',
    company: 'Fidelity Investments',
    department: 'Technology',
    location: 'Bangalore, Karnataka, India',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    jobId: '2131693',
    requisitionId: '2131693',
    sourceUrl: 'https://jobs.fidelity.com/in/jobs/2131693/lead-software-engineer/',
    applyUrl: 'https://jobs.fidelity.com/in/jobs/2131693/lead-software-engineer/',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Bachelor’s Degree in Computer Science / similar technical subject area and or equivalent experience',
      '5+ years of experience as a Power BI Developer with a strong portfolio of built reports, dashboards, and visualizations.',
      'Strong problem solving & collaboration skills',
      'Excellent communication skills required',
    ],
    postingDate: '2026-07-14T00:00:00.000Z',
    closingDate: null,
    jobDescription: "Job Description: Job Title: Lead - Software Engineering The Team Fidelity's Workplace Investing Reporting and Analytics chapter is seeking a Senior PowerBI Developer. The Expertise You Have Bachelor’s Degree in Computer Science / similar technical subject area and or equivalent experience 5+ years of experience as a Power BI Developer with a strong portfolio of built reports, dashboards, and visualizations. The Skills You Bring Strong problem solving & collaboration skills Excellent communication skills required Location: Bangalore Shift timings: 11:00 am - 8:00pm",
  })

  assert.deepEqual(jobs[1], {
    title: 'Principal Network Engineer',
    company: 'Fidelity Investments',
    department: 'Technology',
    location: 'Bangalore, Karnataka, India; Chennai, Tamil Nadu, India',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    jobId: '2130302',
    requisitionId: '2130302',
    sourceUrl: 'https://jobs.fidelity.com/in/jobs/2130302/principal-network-engineer/',
    applyUrl: 'https://jobs.fidelity.com/in/jobs/2130302/principal-network-engineer/',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Strong knowledge and working experience with Juniper SRX, Check Point and Cisco Firepower security appliances',
      'Strong knowledge of Cisco Nexus, ASR and Catalyst routing and switching platforms',
    ],
    postingDate: '2026-06-24T00:00:00.000Z',
    closingDate: null,
    jobDescription: 'Job Description: Job Title - Principal Network Engineer The Purpose of This Role As Principal Network Engineer in the Network Security Engineering team you will be responsible for engineering and management of network security infrastructure for Fidelity Investments globally. The Skills that are Key to this role Strong knowledge and working experience with Juniper SRX, Check Point and Cisco Firepower security appliances Strong knowledge of Cisco Nexus, ASR and Catalyst routing and switching platforms Location: Bangalore Shift timings: 2 PM to 11 PM',
  })
})

test('run validates the verified Fidelity India page and XML feed once, then decorates shared runner fields', async () => {
  const fedilityInvestments = await loadModule()
  const requestedUrls = []

  const jobs = await fedilityInvestments.createFedilityInvestmentsScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === JOBS_PAGE_URL) return jobsPageHtml
      if (url === JOBS_XML_URL) return jobsXml
      throw new Error(`Unexpected Fedility Investments URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [JOBS_PAGE_URL, JOBS_XML_URL])
  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      company: job.company,
      source: job.source,
      link: job.link,
      scrapedAt: job.scrapedAt,
    })),
    [
      {
        title: 'Lead Software Engineer',
        company: 'Fidelity Investments',
        source: 'fedilityinvestments',
        link: 'https://jobs.fidelity.com/in/jobs/2131693/lead-software-engineer/',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        title: 'Principal Network Engineer',
        company: 'Fidelity Investments',
        source: 'fedilityinvestments',
        link: 'https://jobs.fidelity.com/in/jobs/2130302/principal-network-engineer/',
        scrapedAt: FIXED_SCRAPED_AT,
      },
    ],
  )
})

test('run fails closed when the verified Fidelity India jobs page or XML feed contract drifts', async () => {
  const fedilityInvestments = await loadModule()

  await assert.rejects(
    fedilityInvestments.createFedilityInvestmentsScraper().run({
      fetchText: async (url) => {
        if (url === JOBS_PAGE_URL) {
          return jobsPageHtml.replace('Find the right match for your skills and location.', 'Explore careers')
        }
        throw new Error(`Unexpected Fedility Investments URL: ${url}`)
      },
    }),
    /verified fidelity india jobs page/i,
  )

  await assert.rejects(
    fedilityInvestments.createFedilityInvestmentsScraper().run({
      fetchText: async (url) => {
        if (url === JOBS_PAGE_URL) return jobsPageHtml
        if (url === JOBS_XML_URL) {
          return jobsXml.replace('<publisher>Fidelity Investments Careers</publisher>', '<publisher>Other Careers</publisher>')
        }
        throw new Error(`Unexpected Fedility Investments URL: ${url}`)
      },
    }),
    /verified fidelity india xml feed/i,
  )
})
