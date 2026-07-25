import assert from 'node:assert/strict'
import test from 'node:test'

import { runApiPortalScraper } from '../apiPortal/engine.js'
import { getScraperCatalog } from '../providers/index.js'

test('runApiPortalScraper maps the Ujjivan first-party jobs API into the shared job shape', async () => {
  const provider = getScraperCatalog().find((item) => item.source === 'ujjivan')
  assert.ok(provider)

  const jobs = await runApiPortalScraper({
    provider,
    fetchJson: async () => ({
      success: true,
      count: 2,
      lastUpdated: '2026-07-11T06:00:06.482Z',
      data: [
        {
          job_id: '5fb367a8568a4',
          job_code: 'UJJ-JOB-6',
          job_title: 'Branch Manager - Multilpe locations',
          parent_department: 'BRANCH BANKING',
          department: 'NORTH BUSINESS',
          employee_type: 'Permanent',
          experience_from: '1',
          experience_to: '4',
          is_remote: 0,
          job_updated_timestamp: '11-07-2026 11:19:53',
          location_city: ['', '', 'Bulandshahr', 'Bharatpur'],
        },
        {
          job_id: '68708f6130a93',
          job_code: 'UJJ-INT-11',
          job_title: 'Tech Intern',
          parent_department: 'TECHNOLOGY',
          department: 'CORPORATE OFFICE',
          employee_type: 'Intern',
          experience_from: '0',
          experience_to: '1',
          is_remote: 1,
          job_updated_timestamp: '11-07-2026 09:45:00',
          location_city: ['Bengaluru'],
        },
      ],
    }),
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Branch Manager - Multilpe locations',
    company: 'Ujjivan',
    location: 'Bulandshahr',
    city: 'Bulandshahr',
    country: 'India',
    link: 'https://www.ujjivansfb.bank.in/career-details?id=5fb367a8568a4',
    applyUrl: 'https://www.ujjivansfb.bank.in/career-details?id=5fb367a8568a4',
    sourceUrl: 'https://www.ujjivansfb.bank.in/career-details?id=5fb367a8568a4',
    source: 'ujjivan',
    jobId: '5fb367a8568a4',
    requisitionId: 'UJJ-JOB-6',
    department: 'BRANCH BANKING',
    employmentType: 'Full-time',
    experienceRequired: '1 - 4 years',
    postingDate: '11-07-2026 11:19:53',
    jobDescription: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    remoteStatus: 'On-site',
    scrapedAt: jobs[0].scrapedAt,
  })
  assert.deepEqual(jobs[1], {
    title: 'Tech Intern',
    company: 'Ujjivan',
    location: 'Bengaluru',
    city: 'Bengaluru',
    country: 'India',
    link: 'https://www.ujjivansfb.bank.in/career-details?id=68708f6130a93',
    applyUrl: 'https://www.ujjivansfb.bank.in/career-details?id=68708f6130a93',
    sourceUrl: 'https://www.ujjivansfb.bank.in/career-details?id=68708f6130a93',
    source: 'ujjivan',
    jobId: '68708f6130a93',
    requisitionId: 'UJJ-INT-11',
    department: 'TECHNOLOGY',
    employmentType: 'Internship',
    experienceRequired: '0 - 1 years',
    postingDate: '11-07-2026 09:45:00',
    jobDescription: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    remoteStatus: 'Remote',
    scrapedAt: jobs[1].scrapedAt,
  })
})
