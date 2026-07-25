import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'sahyadriindustries',
)

const careersHtml = readFileSync(path.join(fixturesDir, 'careers.html'), 'utf8')

const loadModule = async () => {
  try {
    return await import('../sahyadriindustries/script.js')
  } catch {
    assert.fail('Expected Sahyadri Industries scraper module at ../sahyadriindustries/script.js')
  }
}

test('Sahyadri Industries helpers recognize the verified first-party careers surface and extract live jobs', async () => {
  const sahyadri = await loadModule()

  assert.equal(sahyadri.SOURCE, 'sahyadriindustries')
  assert.equal(sahyadri.COMPANY, 'Sahyadri Industries')
  assert.equal(sahyadri.CAREERS_URL, 'https://www.silworld.in/careers/')
  assert.equal(sahyadri.hasOfficialCareersPageSignal(careersHtml), true)

  const jobs = sahyadri.extractJobsFromCareersPage(careersHtml, {
    scrapedAt: '2026-07-11T06:30:00.000Z',
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Sales Executive',
    company: 'Sahyadri Industries',
    location: 'Pune/Bengaluru/Palghar/Satara (Multilocation)',
    city: 'Pune/Bengaluru/Palghar/Satara (Multilocation)',
    jobId: 'sales-executive-job-desc',
    requisitionId: '1908',
    sourceUrl: 'https://www.silworld.in/careers/',
    applyUrl: 'https://www.silworld.in/careers/',
    department: 'Sales & Marketing',
    employmentType: null,
    experienceRequired: 'Experience in building material industry 1 - 3yrs',
    minimumQualification: 'Graduate/ Diploma holder',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: [
      'We are looking for a self-motivated individual to serve as an onsite Sales Representative. Selling and promoting to existing as well as potential clients Dealers, Distributers and Contractors. Establishing and maintaining positive business relationships with clients',
      'Key Responsibilities:',
      '- Visit dealers & distributors to generate orders',
      '- Explore new markets',
      '- Maintain relations with dealers & distributors',
      '- Assisting with corporate marketing strategies and expanding the company to new markets',
      '- Collecting orders, ensuring products are available at dealers location, ordering & maintaining more stock',
      'Requirements:',
      '- Willingness to travel extensively 70 to 80 km daily for visiting dealers',
      '- Two-Wheeler (Motor Cycle) & Driving Licence is must',
      '- Strong mechanical aptitude and problem-solving skills',
      'Experience:',
      'Experience in building material industry 1 - 3yrs',
      'Candidates having experience in Paint industries/ Plumbing/ Sanitary ware & fittings Front line sales who visit shop counters to get orders/ site visits to get project orders would be preferred. Also connections with dealers, distributes, builders & carpenters will be added advantage',
      'Work Schedule:',
      '- Timing: 9:30 AM - 6:30 PM (Monday to Saturday)',
      '- Weekly Off: Sunday',
      '- Food Allowance 175-250 Rs/- Day (as per travel policy)',
      '- Petrol Allowance 4.5 Rs. /- Km (as per travel policy)',
    ].join('\n'),
    source: 'sahyadriindustries',
    link: 'https://www.silworld.in/careers/',
    scrapedAt: '2026-07-11T06:30:00.000Z',
  })

  assert.equal(jobs[1].jobId, 'asm-job-desc')
  assert.equal(jobs[1].title, 'Area Sales Manager (ASM)')
  assert.equal(jobs[1].experienceRequired, 'Experience in building material industry 6 yrs & above')
  assert.match(jobs[1].jobDescription, /Current designation - ASM\/Sr Sales Executive/i)
})

test('Sahyadri Industries scraper validates the official careers page before returning live jobs', async () => {
  const sahyadri = await loadModule()
  const requestedUrls = []

  const jobs = await sahyadri.createSahyadriIndustriesScraper({
    now: () => new Date('2026-07-11T06:30:00.000Z'),
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, [sahyadri.CAREERS_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[1].jobId, 'asm-job-desc')
})

test('Sahyadri Industries scraper fails closed when the verified careers surface changes materially', async () => {
  const sahyadri = await loadModule()

  await assert.rejects(
    sahyadri.createSahyadriIndustriesScraper().run({
      fetchText: async () => '<html><title>Unexpected</title></html>',
    }),
    /verified official careers page/i,
  )

  await assert.rejects(
    sahyadri.createSahyadriIndustriesScraper().run({
      fetchText: async () => careersHtml.replace('Apply Now', 'Send Resume'),
    }),
    /public jobs were extracted/i,
  )
})
