import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BOUNTEOUS_JOB_ROUTE_PREFIX,
  CAREER_PAGE_URL,
  TURBOHIRE_ENDPOINT,
  createAccoliteDigitalScraper,
  extractSearchResults,
} from './script.js'

const sampleTurboHirePayload = {
  response: [
    {
      id: 't__12345678-90ab-cdef-1234-567890abcdef',
      id_raw: '12345678-90ab-cdef-1234-567890abcdef',
      text: 'Senior Android Developer',
      description: '<p>Build mobile apps for enterprise clients.</p>',
      experience: {
        MinExp: 6,
        MaxExp: 8,
      },
      country: 'in',
      skills: ['Android', 'Kotlin'],
      workplaceType: 'onsite',
      categories: {
        department: 'Accolite',
        team: 'BU',
        commitment: 'Full Time',
        allLocations: ['Chennai'],
        location: 'Chennai',
      },
      applyUrl: '',
    },
    {
      id: 't__other-1',
      id_raw: 'other-1',
      text: 'Data Engineer',
      description: '<p>Build data products.</p>',
      country: 'in',
      skills: ['Python'],
      categories: {
        department: 'Bounteous',
        team: 'Data',
        commitment: 'Full Time',
        allLocations: ['Bengaluru, India'],
        location: 'Bengaluru, India',
      },
      applyUrl: '',
    },
    {
      id: 't__other-2',
      id_raw: 'other-2',
      text: 'Senior Consultant',
      description: '<p>Support the Europe delivery team.</p>',
      country: 'uk',
      skills: ['Consulting'],
      categories: {
        department: 'Accolite',
        team: 'Consulting',
        commitment: 'Full Time',
        allLocations: ['London, United Kingdom'],
        location: 'London, United Kingdom',
      },
      applyUrl: '',
    },
  ],
}

test('uses the public Bounteous careers routes and TurboHire feed for Accolite Digital jobs', () => {
  assert.equal(CAREER_PAGE_URL, 'https://www.bounteous.com/careers/search-results')
  assert.equal(TURBOHIRE_ENDPOINT, 'https://www.bounteous.com/turbohire/api/')
  assert.equal(BOUNTEOUS_JOB_ROUTE_PREFIX, 'https://www.bounteous.com/careers/job/')
})

test('extractSearchResults keeps only India jobs from the Accolite slice of the shared Bounteous feed', () => {
  const jobs = extractSearchResults(sampleTurboHirePayload)

  assert.deepEqual(jobs, [
    {
      title: 'Senior Android Developer',
      company: 'Accolite Digital',
      department: 'Accolite',
      location: 'Chennai, India',
      city: 'Chennai',
      country: 'India',
      jobId: 't__12345678-90ab-cdef-1234-567890abcdef',
      requisitionId: '12345678-90ab-cdef-1234-567890abcdef',
      sourceUrl: 'https://www.bounteous.com/careers/job/t__12345678-90ab-cdef-1234-567890abcdef',
      applyUrl: 'https://www.bounteous.com/careers/job/t__12345678-90ab-cdef-1234-567890abcdef',
      employmentType: 'Full Time',
      experienceRequired: '6-8 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Android', 'Kotlin'],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Build mobile apps for enterprise clients.',
      remoteStatus: 'On-site',
    },
  ])
})

test('run decorates filtered Accolite jobs with shared scraper metadata', async () => {
  const requestedUrls = []
  const scraper = createAccoliteDigitalScraper({ maxJobs: 1 })

  const jobs = await scraper.run({
    fetchJson: async (url) => {
      requestedUrls.push(url)
      return sampleTurboHirePayload
    },
  })

  assert.deepEqual(requestedUrls, [TURBOHIRE_ENDPOINT])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'accolitedigital')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
})
