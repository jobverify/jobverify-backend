import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_PAGE_URL,
  extractJobCards,
  extractJobDetail,
} from '../../scraper/blubridge/script.js'

const listingHtml = `
  <html>
    <body>
      <a class="job-row job-row-grid" href="/careers/job/administration-executive-male">
        <span>Administration Executive (Male)</span>
        <span>Operations</span>
        <span>Chennai</span>
      </a>
      <a class="job-row job-row-grid" href="https://blubridge.com/careers/job/ai-ml-engineer-freshers">
        <span>AI ML Engineer (Freshers)</span>
        <span>Engineering</span>
        <span>Chennai</span>
      </a>
      <a href="/contact">Contact</a>
    </body>
  </html>
`

const detailHtml = `
  <html>
    <head>
      <title>Administration Executive (Male) | Careers | BluBridge</title>
    </head>
    <body>
      <div>OPERATIONS • ADMINISTRATION</div>
      <h1>Administration Executive (Male)</h1>
      <div>Besant Nagar, Chennai</div>
      <div>0-2 Years</div>
      <div>3.5-5.5 Lacs P.A.</div>
      <div>VACANCIES</div>
      <div>7</div>
      <div>BATCH</div>
      <div>2024, 2025, 2026</div>
      <div>EMPLOYMENT</div>
      <div>Full Time</div>
      <div>About the Role</div>
      <p>We are seeking Administration Officers to manage administrative operations.</p>
      <div>Education</div>
      <p>Bachelor's or Master's degree in any discipline</p>
      <div>Key Responsibilities</div>
      <ul>
        <li>Oversee and manage end-to-end administrative operations</li>
        <li>Manage vendor lifecycle and procurement coordination</li>
      </ul>
      <div>Requirements</div>
      <ul>
        <li>Strong organizational and coordination abilities</li>
        <li>Excellent communication and reporting skills</li>
      </ul>
      <div>Skills</div>
      <span>Administration</span>
      <span>Office Management</span>
      <span>Vendor Coordination</span>
      <div>Ready to Join Our Team?</div>
    </body>
  </html>
`

test('CAREER_PAGE_URL keeps the Blubridge scraper on the official careers page', () => {
  assert.equal(CAREER_PAGE_URL, 'https://blubridge.com/careers')
})

test('extractJobCards reads unique job rows from the Blubridge careers listing', () => {
  assert.deepEqual(extractJobCards(listingHtml), [
    {
      title: 'Administration Executive (Male)',
      department: 'Operations',
      location: 'Chennai',
      url: 'https://blubridge.com/careers/job/administration-executive-male',
    },
    {
      title: 'AI ML Engineer (Freshers)',
      department: 'Engineering',
      location: 'Chennai',
      url: 'https://blubridge.com/careers/job/ai-ml-engineer-freshers',
    },
  ])
})

test('extractJobDetail reads Blubridge job detail pages into scraper jobs', () => {
  assert.deepEqual(
    extractJobDetail(
      detailHtml,
      'https://blubridge.com/careers/job/administration-executive-male',
    ),
    {
      title: 'Administration Executive (Male)',
      company: 'Blubridge Technologies Pvt Ltd',
      department: 'Operations / Administration',
      location: 'Besant Nagar, Chennai',
      city: 'Chennai',
      jobId: 'administration-executive-male',
      requisitionId: null,
      sourceUrl: 'https://blubridge.com/careers/job/administration-executive-male',
      applyUrl: 'https://blubridge.com/careers/job/administration-executive-male',
      employmentType: 'Full Time',
      experienceRequired: '0-2 Years',
      minimumQualification: "Bachelor's or Master's degree in any discipline",
      preferredQualification: null,
      requiredSkills: [
        'Administration',
        'Office Management',
        'Vendor Coordination',
      ],
      postingDate: null,
      closingDate: null,
      jobDescription: [
        'About the Role: We are seeking Administration Officers to manage administrative operations.',
        "Education: Bachelor's or Master's degree in any discipline",
        'Key Responsibilities: Oversee and manage end-to-end administrative operations; Manage vendor lifecycle and procurement coordination',
        'Requirements: Strong organizational and coordination abilities; Excellent communication and reporting skills',
      ].join('\n'),
    },
  )
})
