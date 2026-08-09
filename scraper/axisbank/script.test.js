import assert from 'node:assert/strict'
import test from 'node:test'

const loadAxisBankModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Axis Bank scraper module at ./script.js')
  }
}

const OFFICIAL_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers New</title>
  </head>
  <body>
    <h1>Come, join our team and be a part of our growth journey at Axis Bank!</h1>
    <p>Openings for your profile</p>
    <h1>Come, join our team and be a part of our growth journey!</h1>
    <a href="https://axisbank.ripplehire.com/candidate/?token=WIXhCuz0XRZ7H0GZCwjJ&amp;source=CAREERSITE#list">Explore Opportunities</a>
    <a href="https://axisbank.ripplehire.com/candidate/?token=WIXhCuz0XRZ7H0GZCwjJ&amp;source=CAREERSITE#apply/job/7">Upload Resume</a>
    <p>don't see your preferred role listed here?</p>
  </body>
</html>
`

const SEARCH_XML = `
<careerSiteResponse>
  <startJobIndex>0</startJobIndex>
  <maxJobSize>10</maxJobSize>
  <totalJobCount>2</totalJobCount>
  <jobVoList><jobSeq>739958</jobSeq><jobTitle>Branch:Branch Relationship Officer</jobTitle><jobDesc/><jobLocation/><jobReqExp>2 - 4 Years</jobReqExp><jobPostingDate/><locations>Kishangarh</locations><jobId>739958</jobId><jobTypeCustom3/></jobVoList>
  <jobVoList><jobSeq>739956</jobSeq><jobTitle>Branch:Teller</jobTitle><jobDesc/><jobLocation/><jobReqExp>2 - 4 Years</jobReqExp><jobPostingDate/><locations>Bhilwara</locations><jobId>739956</jobId><jobTypeCustom3/></jobVoList>
</careerSiteResponse>
`

const DETAIL_XML = `
<jobVO>
  <jobSeq>739958</jobSeq>
  <jobTitle>Branch:Branch Relationship Officer</jobTitle>
  <locations>Kishangarh</locations>
  <jobId>739958</jobId>
  <jobReqExp>2 - 4 Years</jobReqExp>
  <jobTypeCustom3>Regular</jobTypeCustom3>
  <jobDesc><p>Role Proficiencies:</p><p>- Relationship management</p></jobDesc>
  <publishDetails><CAREER_SITE>2026-08-08</CAREER_SITE></publishDetails>
</jobVO>
`

test('Axis Bank verifies the official careers handoff and extracts the Ripplehire token', async () => {
  const axis = await loadAxisBankModule()

  assert.equal(axis.VERIFIED_ON, '2026-08-08')
  assert.equal(axis.hasOfficialCareersSignal(OFFICIAL_CAREERS_HTML), true)
  assert.deepEqual(axis.extractRipplehireCareersHandoff(OFFICIAL_CAREERS_HTML), {
    token: 'WIXhCuz0XRZ7H0GZCwjJ',
    source: 'CAREERSITE',
    href: 'https://axisbank.ripplehire.com/candidate/?token=WIXhCuz0XRZ7H0GZCwjJ&source=CAREERSITE#list',
  })
})

test('Axis Bank falls back to listing-only jobs when the Ripplehire detail endpoint is broken', async () => {
  const axis = await loadAxisBankModule()

  const jobs = await axis.createAxisBankScraper({
    fetchText: async (url, options = {}) => {
      if (url === axis.OFFICIAL_CAREERS_PAGE_URL) return OFFICIAL_CAREERS_HTML
      if (url === `${axis.BASE_URL}${axis.SEARCH_PATH}` && options.method === 'POST') return SEARCH_XML
      if (/candidatejobdetail/i.test(url)) {
        throw new Error(`HTTP 500 for ${url}`)
      }
      throw new Error(`Unexpected URL: ${url}`)
    },
  }).run({ maxPages: 1 })

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Branch:Branch Relationship Officer')
  assert.equal(jobs[0].jobDescription, null)
  assert.equal(jobs[0].link, 'https://axisbank.ripplehire.com/candidate/?token=WIXhCuz0XRZ7H0GZCwjJ&source=CAREERSITE#apply/job/739958')
})

test('Axis Bank keeps richer details when the Ripplehire detail endpoint responds normally', async () => {
  const axis = await loadAxisBankModule()

  const jobs = await axis.createAxisBankScraper({
    fetchText: async (url, options = {}) => {
      if (url === axis.OFFICIAL_CAREERS_PAGE_URL) return OFFICIAL_CAREERS_HTML
      if (url === `${axis.BASE_URL}${axis.SEARCH_PATH}` && options.method === 'POST') return SEARCH_XML
      if (/jobSeq=739958/i.test(url)) return DETAIL_XML
      if (/jobSeq=739956/i.test(url)) throw new Error(`HTTP 500 for ${url}`)
      throw new Error(`Unexpected URL: ${url}`)
    },
  }).run({ maxPages: 1 })

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].jobDescription, 'Role Proficiencies: - Relationship management')
  assert.deepEqual(jobs[0].requiredSkills, ['Relationship management'])
  assert.equal(jobs[0].postingDate, '2026-08-08')
  assert.equal(jobs[1].jobDescription, null)
})
