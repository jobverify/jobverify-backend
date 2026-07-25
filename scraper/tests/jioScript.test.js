import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildNextPagePayload,
  extractAspNetState,
  extractFunctionCategories,
  extractJobDetail,
  extractListings,
  selectEngineeringCategories,
} from '../jio/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'jio',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

test('extractFunctionCategories reads Jio function cards from the official categories page', () => {
  const html = readFixture('job-categories.html')
  const categories = extractFunctionCategories(html)
  const engineering = categories.find((item) => item.label === 'Engineering & Technology')

  assert.ok(engineering)
  assert.equal(engineering.functionCode, '0206')
  assert.equal(engineering.jobCount, 205)
  assert.equal(
    engineering.url,
    'https://careers.jio.com/frmfuncwisejob.aspx?func=09Bqkj0vwzk=&desc=tBOU2f2ubJIKJJaEorlljoC0jBhJb9cLpWXiiP5HyBU=&flag=/wASbQn4xyQ=',
  )
})

test('selectEngineeringCategories keeps the Jio engineering-aligned functions and drops sales-heavy categories', () => {
  const html = readFixture('job-categories.html')
  const labels = selectEngineeringCategories(extractFunctionCategories(html))
    .map((item) => item.label)

  assert.deepEqual(labels, [
    'Engineering & Technology',
    'Infrastructure',
    'IT & Systems',
    'Information Security',
  ])
})

test('extractListings parses Jio jobs from the function-wise listing page', () => {
  const html = readFixture('engineering-page-1.html')
  const jobs = extractListings(html)

  assert.equal(jobs.length, 10)
  assert.deepEqual(jobs[0], {
    title: 'JC Field Engineer ( 86277869 )',
    jobId: '86277869',
    requisitionId: '86277869',
    location: 'Lalitpur',
    city: 'Lalitpur',
    department: 'Engineering & Technology',
    postingDate: '26 Jun 2026',
    sourceUrl:
      'https://careers.jio.com/frmjobdescription.aspx?JBTITLE=8AEzmmAAkwqVWWdBPdG5VQ==&jbID=25vmh9JDGwLZQc8hdjx/8Q==&funcCode=tBOU2f2ubJIKJJaEorlljoC0jBhJb9cLpWXiiP5HyBU=',
  })
})

test('buildNextPagePayload preserves Jio ASP.NET state while clicking the next page button', () => {
  const html = readFixture('engineering-page-1.html')
  const payload = buildNextPagePayload(extractAspNetState(html))

  assert.equal(payload.__EVENTTARGET, '')
  assert.equal(payload.__EVENTARGUMENT, '')
  assert.ok(payload.__VIEWSTATE)
  assert.ok(payload.__EVENTVALIDATION)
  assert.equal(payload['ctl00$MainContent$lstJoblist$DataPager1$ctl00$lnkNext'], 'Next')
})

test('extractJobDetail reads Jio title, department, requirements, and skills from the official detail page', () => {
  const html = readFixture('job-detail-86277869.html')
  const detail = extractJobDetail(html, {
    sourceUrl:
      'https://careers.jio.com/frmjobdescription.aspx?JBTITLE=8AEzmmAAkwqVWWdBPdG5VQ==&jbID=25vmh9JDGwLZQc8hdjx/8Q==&funcCode=tBOU2f2ubJIKJJaEorlljoC0jBhJb9cLpWXiiP5HyBU=',
  })

  assert.deepEqual(detail, {
    title: 'JC Field Engineer ( 86277869 )',
    jobId: '86277869',
    requisitionId: '86277869',
    department: 'Engineering & Technology',
    location: 'Lalitpur',
    city: 'Lalitpur',
    postingDate: '26 Jun 2026',
    employmentType: 'Full-time',
    experienceRequired: '1 - 3 years',
    jobDescription:
      '1. Ensure material tracking and reconciliation management 2. Visit sites regularly and ensure all sites are operational 3. Supervise radio frequency optimization related activities 4. Oversee quality control of vendors & contractors 5. Conduct acceptance test processes 6. Assist Senior Field Engineers in audits on time to time basis 7. Manage deployment related activities conducted by vendors, contractors 8. Configure L2 switch to connect access points and enhance network 9. Trouble shoot faults related to router and replace faulty hardware 10. Link capacity upgrade / microwave upgrade for sites with more than 70% utilization 11. Execute field activities as per work orders issued by Network Operations Centre 12. Meet customers, conduct surveys and provide feedback on network coverage and capacity improvement 13. Release Fiber-to-the-Home desktop plan and carry out joint field survey to verify route, equipment and structure 14. Release final design for construction in compliance to engineering and business guidelines 15. Release capacity augmentation and change request plan as required to continue execution',
    minimumQualification: 'Diploma',
    preferredQualification: null,
    requiredSkills: [
      'Knowledge and experience of network deployment, operations and maintenance',
      'Vendor management skills',
      'Project management skills',
      'Problem solving skills',
      'Supervisory skills',
      'Team player',
    ],
    applyUrl:
      'https://careers.jio.com/frmjobdescription.aspx?JBTITLE=8AEzmmAAkwqVWWdBPdG5VQ==&jbID=25vmh9JDGwLZQc8hdjx/8Q==&funcCode=tBOU2f2ubJIKJJaEorlljoC0jBhJb9cLpWXiiP5HyBU=',
    sourceUrl:
      'https://careers.jio.com/frmjobdescription.aspx?JBTITLE=8AEzmmAAkwqVWWdBPdG5VQ==&jbID=25vmh9JDGwLZQc8hdjx/8Q==&funcCode=tBOU2f2ubJIKJJaEorlljoC0jBhJb9cLpWXiiP5HyBU=',
  })
})
