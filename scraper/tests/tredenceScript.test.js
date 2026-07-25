import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeScrapedJob } from '../utils/normalizeScrapedJob.js'

const loadTredenceModule = async () => {
  try {
    return await import('../tredence/script.js')
  } catch {
    return null
  }
}

const SEARCH_RESULTS_XML = `
<JobPageVO>
  <startJobIndex>0</startJobIndex>
  <maxJobSize>10</maxJobSize>
  <totalJobCount>101</totalJobCount>
  <jobVoList>
    <jobVoList>
      <jobSeq>890548</jobSeq>
      <jobTitle>IT Associate</jobTitle>
      <jobLocation>Bangalore</jobLocation>
      <jobReqExp>0 - 2 Years</jobReqExp>
      <jobPostingDate></jobPostingDate>
      <locations>Bangalore</locations>
      <jobId>890548</jobId>
    </jobVoList>
    <jobVoList>
      <jobSeq>888514</jobSeq>
      <jobTitle>Service Level Manager - DataOps Technical Lead - Databricks/Azure</jobTitle>
      <jobLocation>Bangalore</jobLocation>
      <jobReqExp>7 - 12 Years</jobReqExp>
      <jobPostingDate></jobPostingDate>
      <locations>Bangalore</locations>
      <jobId>888514</jobId>
    </jobVoList>
    <jobVoList>
      <jobSeq>887490</jobSeq>
      <jobTitle>Consulting Director_Analytics</jobTitle>
      <jobLocation>Canada</jobLocation>
      <jobReqExp>13 - 18 Years</jobReqExp>
      <jobPostingDate></jobPostingDate>
      <locations>Toronto</locations>
      <jobId>887490</jobId>
    </jobVoList>
    <jobVoList>
      <jobSeq>886735</jobSeq>
      <jobTitle>Staff Data Engineer</jobTitle>
      <jobLocation></jobLocation>
      <jobReqExp>7 - 12 Years</jobReqExp>
      <jobPostingDate></jobPostingDate>
      <locations>San Jose (TR)</locations>
      <jobId>886735</jobId>
    </jobVoList>
  </jobVoList>
</JobPageVO>
`

const JOB_DETAIL_XML = `
<CandidateJobVO>
  <jobVO>
    <jobSeq>890548</jobSeq>
    <jobId>890548</jobId>
    <jobTitle>IT Associate</jobTitle>
    <jobLocation>Bangalore</jobLocation>
    <locations>Bangalore</locations>
    <jobReqExp>0 - 2 Years</jobReqExp>
    <jobType>R</jobType>
    <jobPostingDate>03-Jul-2026</jobPostingDate>
    <jobDesc>&lt;p style="text-align: center;">&lt;strong>Roles and Responsibilities&lt;/strong>&lt;
&lt;p style="line-height: normal;">&lt;strong>Job Role: L1 - Desktop Operations&lt;/strong>&lt;
&lt;p style="line-height: normal;">&lt;strong>Experience: 2-3 Years&lt;/strong>&lt;
&lt;p style="text-indent: -.25in;">&lt;span style="mso-list: Ignore;">1.&lt;span style="font: 7.0pt 'Times New Roman';">&lt;/span>&lt;/span>Should have good communication and interpersonal skill.&lt;/p>&#xd;
&lt;p style="text-indent: -.25in;">&lt;span style="mso-list: Ignore;">2.&lt;span style="font: 7.0pt 'Times New Roman';">&lt;/span>&lt;/span>Handle daily technical support activities on desktop support, data network and server management.&lt;/p>&#xd;
&lt;p style="text-indent: -.25in;">&lt;span style="mso-list: Ignore;">3.&lt;span style="font: 7.0pt 'Times New Roman';">&lt;/span>&lt;/span>Install and test desktop software applications and internet browsers.&lt;/p>&#xd;
&lt;p style="text-indent: -.25in;">&lt;span style="mso-list: Ignore;">4.&lt;span style="font: 7.0pt 'Times New Roman';">&lt;/span>&lt;/span>Test computers to ensure proper functioning of computer systems.&lt;/p>&#xd;
&lt;p style="background: white;">Key Competencies&lt;/p>
&lt;p style="text-indent: -.25in;">&lt;span style="mso-list: Ignore;">1.&lt;span style="font: 7.0pt 'Times New Roman';">&lt;/span>&lt;/span>Hardware and software troubleshooting (Preferred: Office 365, VPN)&lt;/p>&#xd;
&lt;p style="text-indent: -.25in;">&lt;span style="mso-list: Ignore;">2.&lt;span style="font: 7.0pt 'Times New Roman';">&lt;/span>&lt;/span>All operating systems (Windows, Linux, and mac)&lt;/p>&#xd;
    </jobDesc>
    <bussinessUnit></bussinessUnit>
  </jobVO>
</CandidateJobVO>
`

test('buildSearchRequestPayload keeps Tredence listings on the verified public RippleHire board contract', async () => {
  const tredence = await loadTredenceModule()
  assert.ok(tredence)

  assert.deepEqual(tredence.buildSearchRequestPayload(), {
    page: 0,
    search: '*:*',
    campaignSeq: '',
    token: 'rzuz0vttMaz0VxxVzDiY',
    source: 'CAREERSITE',
    pagesize: 10,
  })

  assert.deepEqual(tredence.buildSearchRequestPayload(4), {
    page: 4,
    search: '*:*',
    campaignSeq: '',
    token: 'rzuz0vttMaz0VxxVzDiY',
    source: 'CAREERSITE',
    pagesize: 10,
  })
})

test('isIndiaListing keeps Tredence India roles and excludes foreign locations from the public board', async () => {
  const tredence = await loadTredenceModule()
  assert.ok(tredence)

  assert.equal(tredence.isIndiaListing({ countryCode: 'Bangalore', city: 'Bangalore' }), true)
  assert.equal(tredence.isIndiaListing({ countryCode: 'Gurgaon', city: 'Gurgaon' }), true)
  assert.equal(tredence.isIndiaListing({ countryCode: 'Canada', city: 'Toronto' }), false)
  assert.equal(tredence.isIndiaListing({ countryCode: '', city: 'San Jose (TR)' }), false)
})

test('extractSearchResults parses Tredence RippleHire XML and filters listings to India roles', async () => {
  const tredence = await loadTredenceModule()
  assert.ok(tredence)

  const jobs = tredence.extractSearchResults(SEARCH_RESULTS_XML)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'IT Associate',
    location: 'Bangalore, India',
    city: 'Bangalore',
    jobId: '890548',
    requisitionId: '890548',
    sourceUrl: 'https://tredence.ripplehire.com/candidate/?token=rzuz0vttMaz0VxxVzDiY&source=CAREERSITE#detail/job/890548',
    applyUrl: 'https://tredence.ripplehire.com/candidate/?token=rzuz0vttMaz0VxxVzDiY&source=CAREERSITE#apply/job/890548',
    experienceRequired: '0 - 2 Years',
    postingDate: null,
    department: null,
  })

  assert.deepEqual(jobs[1], {
    title: 'Service Level Manager - DataOps Technical Lead - Databricks/Azure',
    location: 'Bangalore, India',
    city: 'Bangalore',
    jobId: '888514',
    requisitionId: '888514',
    sourceUrl: 'https://tredence.ripplehire.com/candidate/?token=rzuz0vttMaz0VxxVzDiY&source=CAREERSITE#detail/job/888514',
    applyUrl: 'https://tredence.ripplehire.com/candidate/?token=rzuz0vttMaz0VxxVzDiY&source=CAREERSITE#apply/job/888514',
    experienceRequired: '7 - 12 Years',
    postingDate: null,
    department: null,
  })
})

test('extractSearchSummary reads total counts and page offsets from Tredence RippleHire XML', async () => {
  const tredence = await loadTredenceModule()
  assert.ok(tredence)

  assert.deepEqual(tredence.extractSearchSummary(SEARCH_RESULTS_XML), {
    startJobIndex: 0,
    pageSize: 10,
    totalJobCount: 101,
  })
})

test('extractJobDetail pulls Tredence description, posting date, numbered skills, and apply URLs from the detail XML', async () => {
  const tredence = await loadTredenceModule()
  assert.ok(tredence)

  const detail = tredence.extractJobDetail(JOB_DETAIL_XML, {
    title: 'IT Associate',
    location: 'Bangalore, India',
    city: 'Bangalore',
    jobId: '890548',
    requisitionId: '890548',
    sourceUrl: tredence.buildDetailUrl('890548'),
    applyUrl: tredence.buildApplyUrl('890548'),
    experienceRequired: '0 - 2 Years',
  })

  assert.equal(detail.title, 'IT Associate')
  assert.equal(detail.location, 'Bangalore, India')
  assert.equal(detail.city, 'Bangalore')
  assert.equal(detail.jobId, '890548')
  assert.equal(detail.requisitionId, '890548')
  assert.equal(detail.department, null)
  assert.equal(detail.employmentType, 'Full-time')
  assert.equal(detail.experienceRequired, '0 - 2 Years')
  assert.match(detail.jobDescription, /Roles and Responsibilities/i)
  assert.match(detail.jobDescription, /daily technical support activities/i)
  assert.deepEqual(detail.requiredSkills.slice(0, 4), [
    'Should have good communication and interpersonal skill.',
    'Handle daily technical support activities on desktop support, data network and server management.',
    'Install and test desktop software applications and internet browsers.',
    'Test computers to ensure proper functioning of computer systems.',
  ])
  assert.equal(detail.postingDate, '03-Jul-2026')
  assert.equal(detail.applyUrl, tredence.buildApplyUrl('890548'))
  assert.equal(detail.sourceUrl, tredence.buildDetailUrl('890548'))
})

test('normalizeScrapedJob composes Tredence junior full-time roles from RippleHire detail payloads', async () => {
  const tredence = await loadTredenceModule()
  assert.ok(tredence)

  const detail = tredence.extractJobDetail(JOB_DETAIL_XML, {
    title: 'IT Associate',
    location: 'Bangalore, India',
    city: 'Bangalore',
    jobId: '890548',
    requisitionId: '890548',
    sourceUrl: tredence.buildDetailUrl('890548'),
    applyUrl: tredence.buildApplyUrl('890548'),
    experienceRequired: '0 - 2 Years',
  })

  const normalized = normalizeScrapedJob(detail, {
    source: 'tredence',
    companyName: 'Tredence',
    companyCareerPage: 'https://www.tredence.com/careers/greatest-of-ai',
    atsPlatform: 'ripplehire',
  })

  assert.equal(normalized.employmentType, 'Full-time')
  assert.equal(normalized.experienceLevel, 'Junior Level')
  assert.equal(normalized.jobType, 'Full-time Experienced')
})

test('run fetches the Tredence RippleHire listing and detail payloads, then decorates shared runner fields', async () => {
  const tredence = await loadTredenceModule()
  assert.ok(tredence)

  const requested = []
  const scraper = tredence.createTredenceScraper()

  const jobs = await scraper.run({
    maxPages: 1,
    fetchText: async (url, options = {}) => {
      requested.push({
        url,
        method: options.method || 'GET',
        body: options.body ? String(options.body) : null,
      })

      if (url === 'https://tredence.ripplehire.com/candidate/candidatejobsearch') {
        return SEARCH_RESULTS_XML
      }

      if (url.includes('jobSeq=890548')) {
        return JOB_DETAIL_XML
      }

      if (url.includes('jobSeq=888514')) {
        return JOB_DETAIL_XML
          .replaceAll('890548', '888514')
          .replace('IT Associate', 'Service Level Manager - DataOps Technical Lead - Databricks/Azure')
          .replaceAll('0 - 2 Years', '7 - 12 Years')
          .replace('03-Jul-2026', '01-Jul-2026')
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requested.map((entry) => entry.method), ['POST', 'GET', 'GET'])
  assert.match(requested[0].body, /rzuz0vttMaz0VxxVzDiY/)
  assert.match(requested[0].body, /CAREERSITE/)
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].company, 'Tredence')
  assert.equal(jobs[0].source, 'tredence')
  assert.equal(
    jobs[0].link,
    'https://tredence.ripplehire.com/candidate/?token=rzuz0vttMaz0VxxVzDiY&source=CAREERSITE#apply/job/890548',
  )
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
