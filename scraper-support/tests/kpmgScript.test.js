import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import * as kpmgScript from '../../scraper/kpmg/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'kpmg',
)

const readJsonFixture = (name) => JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'))

test('buildSearchUrl keeps KPMG searches on the public Oracle Cloud careers finder with board-specific India scoping', () => {
  assert.equal(typeof kpmgScript.buildSearchUrl, 'function')
  assert.equal(
    kpmgScript.buildSearchUrl({ siteNumber: 'CX_1' }),
    'https://ejgk.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=24,offset=0,location=India',
  )
  assert.equal(
    kpmgScript.buildSearchUrl({
      siteNumber: 'CX_3',
      page: 2,
      limit: 10,
      location: 'Bangalore, Karnataka, India',
    }),
    'https://ejgk.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_3,limit=10,offset=20,location=Bangalore, Karnataka, India',
  )
})

test('buildJobDetailUrl keeps KPMG detail links on the public Oracle Cloud candidate route', () => {
  assert.equal(typeof kpmgScript.buildJobDetailUrl, 'function')
  assert.equal(
    kpmgScript.buildJobDetailUrl({ siteNumber: 'CX_3001', jobId: 'INTG10043364' }),
    'https://ejgk.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_3001/job/INTG10043364',
  )
})

test('extractSearchResults normalizes KPMG Oracle Cloud requisitions and keeps only India jobs', () => {
  assert.equal(typeof kpmgScript.extractSearchResults, 'function')

  const payload = readJsonFixture('cx1-search-results.json')
  const jobs = kpmgScript.extractSearchResults(payload, { siteNumber: 'CX_1' })

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Associate Consultant -Market Risk',
    company: 'KPMG',
    department: null,
    location: 'Mumbai, Maharashtra, India',
    city: 'Mumbai',
    jobId: 'INTG10043364',
    requisitionId: 'INTG10043364',
    sourceUrl: 'https://ejgk.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/INTG10043364',
    applyUrl: 'https://ejgk.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/INTG10043364',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-06-25',
    closingDate: null,
    jobDescription: 'Support market risk engagements. Deliver analytics and reporting.',
  })
})

test('createKpmgScraper aggregates the public KPMG India Oracle Cloud boards', async () => {
  assert.equal(typeof kpmgScript.createKpmgScraper, 'function')

  const cx1Payload = {
    items: [{
      TotalJobsCount: 1,
      Limit: 24,
      requisitionList: [{
        Id: 'INTG10043364',
        Title: 'Associate Consultant -Market Risk',
        PostedDate: '2026-06-25',
        PrimaryLocationCountry: 'IN',
        PrimaryLocation: 'Mumbai, Maharashtra, India',
        ShortDescriptionStr: 'Support market risk engagements.',
        ExternalResponsibilitiesStr: 'Deliver analytics and reporting.',
      }],
    }],
  }
  const cx3Payload = {
    items: [{
      TotalJobsCount: 1,
      Limit: 24,
      requisitionList: [{
        Id: 'INTG10043365',
        Title: 'Senior- Oracle Security',
        PostedDate: '2026-06-26',
        PrimaryLocationCountry: 'IN',
        PrimaryLocation: 'Bangalore, Karnataka, India',
        Department: 'Cyber Security',
        ShortDescriptionStr: 'Secure Oracle estates.',
        ExternalResponsibilitiesStr: 'Lead reviews and remediation.',
      }],
    }],
  }
  const cx3001Payload = {
    items: [{
      TotalJobsCount: 1,
      Limit: 24,
      requisitionList: [{
        Id: 'INTG10043366',
        Title: 'Manager-KDNI Oracle HCM Cloud-Gurgaon',
        PostedDate: '2026-06-27',
        PrimaryLocationCountry: 'IN',
        PrimaryLocation: 'Gurgaon, Haryana, India',
        Department: 'Oracle HCM',
        ShortDescriptionStr: 'Drive HCM delivery.',
        ExternalResponsibilitiesStr: 'Manage enterprise implementations.',
      }],
    }],
  }

  const responsesByUrl = new Map([
    [kpmgScript.buildSearchUrl({ siteNumber: 'CX_1', page: 0 }), cx1Payload],
    [kpmgScript.buildSearchUrl({ siteNumber: 'CX_3', page: 0 }), cx3Payload],
    [kpmgScript.buildSearchUrl({ siteNumber: 'CX_3001', page: 0 }), cx3001Payload],
  ])
  const calls = []
  const fetchImpl = async (url) => {
    calls.push(url)
    const payload = responsesByUrl.get(url)
    assert.ok(payload, `unexpected fetch for ${url}`)

    return {
      ok: true,
      async json() {
        return payload
      },
    }
  }

  const jobs = await kpmgScript.createKpmgScraper({
    maxPages: 1,
    fetchImpl,
  }).run()

  assert.deepEqual(calls, [...responsesByUrl.keys()])
  assert.equal(jobs.length, 3)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      city: job.city,
      source: job.source,
      company: job.company,
      link: job.link,
    })),
    [
      {
        title: 'Associate Consultant -Market Risk',
        city: 'Mumbai',
        source: 'kpmg',
        company: 'KPMG',
        link: 'https://ejgk.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/INTG10043364',
      },
      {
        title: 'Senior- Oracle Security',
        city: 'Bangalore',
        source: 'kpmg',
        company: 'KPMG',
        link: 'https://ejgk.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_3/job/INTG10043365',
      },
      {
        title: 'Manager-KDNI Oracle HCM Cloud-Gurgaon',
        city: 'Gurgaon',
        source: 'kpmg',
        company: 'KPMG',
        link: 'https://ejgk.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_3001/job/INTG10043366',
      },
    ],
  )
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})
