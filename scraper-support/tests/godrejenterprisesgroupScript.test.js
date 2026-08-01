import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const officialCareersHtml = readFileSync(
  new URL('./fixtures/godrejandboyce/openings.html', import.meta.url),
  'utf8',
)

test('Godrej Enterprises Group extracts public openings from the verified first-party careers page', async () => {
  const godrej = await import('../../scraper/godrejenterprisesgroup/script.js')

  assert.equal(godrej.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.deepEqual(godrej.extractPublicJobs(officialCareersHtml), [
    {
      title: 'Rental Sales Bangalore',
      company: 'Godrej Enterprises Group',
      department: 'Material Handling Equipment',
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      jobId: '31354',
      requisitionId: '31354',
      sourceUrl: 'https://careeropportunities.godrejenterprises.com/CareerWEB/vacancy-details?SRNO=31354',
      applyUrl: 'https://careeropportunities.godrejenterprises.com/CareerWEB/vacancy-details?SRNO=31354',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    },
    {
      title: 'Manager - Sales and Marketing',
      company: 'Godrej Enterprises Group',
      department: 'Tooling',
      location: 'Mumbai, India',
      city: 'Mumbai',
      country: 'India',
      jobId: '30652',
      requisitionId: '30652',
      sourceUrl: 'https://careeropportunities.godrejenterprises.com/CareerWEB/vacancy-details?SRNO=30652',
      applyUrl: 'https://careeropportunities.godrejenterprises.com/CareerWEB/vacancy-details?SRNO=30652',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    },
    {
      title: 'Special Process',
      company: 'Godrej Enterprises Group',
      department: 'Aerospace',
      location: 'Mumbai, India',
      city: 'Mumbai',
      country: 'India',
      jobId: '30692',
      requisitionId: '30692',
      sourceUrl: 'https://careeropportunities.godrejenterprises.com/CareerWEB/vacancy-details?SRNO=30692',
      applyUrl: 'https://careeropportunities.godrejenterprises.com/CareerWEB/vacancy-details?SRNO=30692',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    },
  ])
})

test('Godrej Enterprises Group run decorates official openings for persistence', async () => {
  const godrej = await import('../../scraper/godrejenterprisesgroup/script.js')
  const requestedUrls = []

  const jobs = await godrej.createGodrejEnterprisesGroupScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return officialCareersHtml
    },
    now: () => '2026-07-10T15:35:00.000Z',
  })

  assert.deepEqual(requestedUrls, [godrej.CAREERS_URL])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'godrejenterprisesgroup')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-10T15:35:00.000Z')
})

test('Godrej Enterprises Group scraper fails closed when the verified public row structure or vacancy host changes', async () => {
  const godrej = await import('../../scraper/godrejenterprisesgroup/script.js')

  await assert.rejects(
    godrej.createGodrejEnterprisesGroupScraper().run({
      fetchText: async () => officialCareersHtml.replaceAll('ui-job-listing__opening', 'ui-job-listing__legacy'),
    }),
    /verified job-row structure/i,
  )

  await assert.rejects(
    godrej.createGodrejEnterprisesGroupScraper().run({
      fetchText: async () => officialCareersHtml.replace(
        'https://careeropportunities.godrejenterprises.com/CareerWEB/vacancy-details?SRNO=31354',
        'https://jobs.example.com/vacancy-details?SRNO=31354',
      ),
    }),
    /verified vacancy detail links/i,
  )
})
