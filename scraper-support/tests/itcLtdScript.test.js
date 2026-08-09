import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const readFixture = (file) => fs.readFileSync(path.join(currentDir, 'fixtures', 'itcltd', file), 'utf8')

const loadItcLtdModule = async () => {
  try {
    return await import('../../scraper/itcltd/script.js')
  } catch {
    assert.fail('Expected ITC scraper module at ../../scraper/itcltd/script.js')
  }
}

const homepageHtml = readFixture('homepage.html')
const careersHtml = readFixture('careers.html')
const apiPayload = JSON.parse(readFixture('public-jobs.json'))

test('ITC constants stay pinned to the verified official homepage, careers portal, and Zoho Recruit API', async () => {
  const itcLtd = await loadItcLtdModule()

  assert.equal(itcLtd.SOURCE, 'itcltd')
  assert.equal(itcLtd.COMPANY, 'ITC Limited')
  assert.equal(itcLtd.HOMEPAGE_URL, 'https://itcportal.com/')
  assert.equal(itcLtd.CAREERS_PORTAL_URL, 'https://recruitment.itcportal.com/jobs/Careers')
  assert.equal(
    itcLtd.CAREERS_API_URL,
    'https://recruitment.itcportal.com/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite',
  )
  assert.equal(itcLtd.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(itcLtd.hasOfficialPortalSignal(careersHtml), true)
})

test('extractIndiaJobs keeps only published ITC openings and normalizes malformed location fields', async () => {
  const itcLtd = await loadItcLtdModule()

  assert.deepEqual(itcLtd.extractIndiaJobs(apiPayload), [
    {
      title: 'Assistant Manager-Operations',
      company: 'ITC Limited',
      department: 'FMCG/Foods/Beverage',
      location: 'Bangalore North, Karnataka, India',
      city: 'Bangalore North',
      state: 'Karnataka',
      country: 'India',
      jobId: '48611000027520072',
      requisitionId: '48611000027520072',
      sourceUrl: 'https://itcportal.zohorecruit.in/jobs/Careers/48611000027520072/Assistant-Manager-Operations?source=CareerSite',
      applyUrl: 'https://itcportal.zohorecruit.in/jobs/Careers/48611000027520072/Assistant-Manager-Operations?source=CareerSite',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '03/26/2024',
      closingDate: null,
      jobDescription: 'Drive business development thru collaboration with external businesses, partners, distributors (noncompeting) to drive the bottom line Develop export market for ITC’s beverage brands',
      remoteStatus: 'On-site',
    },
    {
      title: 'Manager - Consumer Insights',
      company: 'ITC Limited',
      department: 'Pankh - Career Reboot Program',
      location: 'Remote',
      city: null,
      state: null,
      country: null,
      jobId: '48611000031616045',
      requisitionId: '48611000031616045',
      sourceUrl: 'https://itcportal.zohorecruit.in/jobs/Careers/48611000031616045/Manager---Consumer-Insights?source=CareerSite',
      applyUrl: 'https://itcportal.zohorecruit.in/jobs/Careers/48611000031616045/Manager---Consumer-Insights?source=CareerSite',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '06/06/2024',
      closingDate: null,
      jobDescription: 'Job Purpose To ensure robust processes & methodologies for consumer insights.',
      remoteStatus: 'Remote',
    },
  ])
})

test('run validates the official ITC homepage and careers portal before loading the public jobs feed', async () => {
  const itcLtd = await loadItcLtdModule()
  const requestedUrls = []

  const jobs = await itcLtd.createItcLtdScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === itcLtd.HOMEPAGE_URL) return homepageHtml
      if (url === itcLtd.CAREERS_PORTAL_URL) return careersHtml
      throw new Error(`Unexpected HTML request: ${url}`)
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)
      return apiPayload
    },
    now: () => '2026-07-10T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    itcLtd.HOMEPAGE_URL,
    itcLtd.CAREERS_PORTAL_URL,
    itcLtd.CAREERS_API_URL,
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'itcltd')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-10T00:00:00.000Z')
})

test('run fails closed when the ITC careers portal signal disappears', async () => {
  const itcLtd = await loadItcLtdModule()

  await assert.rejects(
    itcLtd.createItcLtdScraper().run({
      fetchText: async (url) => {
        if (url === itcLtd.HOMEPAGE_URL) return homepageHtml
        return '<html><body>Unexpected page</body></html>'
      },
      fetchJson: async () => apiPayload,
    }),
    /ITC careers portal no longer matches the verified official public surface/i,
  )
})
