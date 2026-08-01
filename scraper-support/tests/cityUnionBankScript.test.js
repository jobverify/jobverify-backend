import assert from 'node:assert/strict'
import test from 'node:test'

const loadCityUnionBankModule = async () => {
  try {
    return await import('../../scraper/cityunionbank/script.js')
  } catch {
    assert.fail('Expected City Union Bank scraper module at ../../scraper/scraper/cityunionbank/script.js')
  }
}

const careersBankHtml = `
  <section>
    <h2>CITY UNION BANK KUMBAKONAM</h2>
    <p>WE ARE LOOKING FOR</p>
    <p>ASSISTANT GENERAL MANAGERS<br>CHIEF MANAGERS / REGIONAL DEVELOPMENT MANAGERS<br>BRANCH MANAGERS / DEPUTY MANAGERS</p>
    <p>APPLICATIONS THROUGH ONLINE MODE ALONE WILL BE CONSIDERED</p>
    <a href="https://zfrmz.com/qIWm4Qfh3bpnJqJSTM48">Click Here to Apply</a>
    <style>.to_apply { color: red; font-weight: 700; }</style>
    <p>Last Updated on: 18-10-2023 01:50:30 AM</p>
  </section>
`

const careersBmAmHtml = `
  <section>
    <h2>CITY UNION BANK KUMBAKONAM</h2>
    <p>WE ARE HIRING FOR</p>
    <p>Branch Managers / Deputy Managers / Assistant Managers / Branch Development Managers</p>
    <p>Only for Gujarat, Rajasthan, Delhi, Punjab, Maharashtra, Andhra Pradesh, Telangana and Karnataka</p>
    <a href="https://zfrmz.com/r0qFKd6Fo0Ebej9igDpB">Click Here to Apply</a>
    <p>Last Updated on: 06-06-2024 11:22:50 PM</p>
  </section>
`

test('extractJobPosting turns City Union Bank official hiring pages into normalized jobs', async () => {
  const cityUnionBank = await loadCityUnionBankModule()
  const [nationwidePage, regionalPage] = cityUnionBank.CAREER_PAGES

  const nationwideJob = cityUnionBank.extractJobPosting(careersBankHtml, nationwidePage)
  const regionalJob = cityUnionBank.extractJobPosting(careersBmAmHtml, regionalPage)

  assert.deepEqual(nationwideJob, {
    title: 'Banking Cadres',
    company: 'City Union Bank',
    department: 'Banking',
    location: 'India',
    city: null,
    country: 'India',
    jobId: 'careers-bank',
    requisitionId: 'careers-bank',
    sourceUrl: 'https://cityunionbank.bank.in/careers-bank',
    applyUrl: 'https://zfrmz.com/qIWm4Qfh3bpnJqJSTM48',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'WE ARE LOOKING FOR ASSISTANT GENERAL MANAGERS CHIEF MANAGERS / REGIONAL DEVELOPMENT MANAGERS BRANCH MANAGERS / DEPUTY MANAGERS APPLICATIONS THROUGH ONLINE MODE ALONE WILL BE CONSIDERED Click Here to Apply',
  })
  assert.equal(regionalJob.title, 'Branch and Deputy Manager Cadres')
  assert.equal(regionalJob.applyUrl, 'https://zfrmz.com/r0qFKd6Fo0Ebej9igDpB')
  assert.match(regionalJob.jobDescription, /Only for Gujarat, Rajasthan, Delhi/i)
})

test('run fetches City Union Bank official career pages and decorates jobs for the shared runner', async () => {
  const cityUnionBank = await loadCityUnionBankModule()
  const requests = []
  const scraper = cityUnionBank.createCityUnionBankScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requests.push(url)
      if (url.endsWith('/careers-bank')) return careersBankHtml
      if (url.endsWith('/careers-bm-am')) return careersBmAmHtml
      throw new Error(`Unexpected City Union Bank URL: ${url}`)
    },
  })

  assert.deepEqual(requests, cityUnionBank.CAREER_PAGES.map((page) => page.sourceUrl))
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'cityunionbank')
  assert.equal(jobs[0].link, 'https://zfrmz.com/qIWm4Qfh3bpnJqJSTM48')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
