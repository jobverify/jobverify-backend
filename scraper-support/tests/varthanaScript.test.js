import assert from 'node:assert/strict'
import test from 'node:test'

import { mapListingRowToJob } from '../../scraper/varthana/script.js'

test('mapListingRowToJob marks verified Workline rows as public experience checked', () => {
  const job = mapListingRowToJob({
    referenceNumber: '6732',
    title: 'Relationship Manager',
    businessUnit: 'School Loans',
    functionName: 'Sales',
    branch: 'Madurai',
    workLocation: 'Madurai',
    applyUrl: 'https://app79.workline.hr/Candidate/CanPRFApplyBL.aspx?PRFCode=3404&Flag=C',
  }, {
    scrapedAt: '2026-08-01T15:44:46.281Z',
  })

  assert.equal(job?.publicExperienceChecked, true)
  assert.equal(job?.experienceRequired, null)
  assert.equal(job?.department, 'Sales')
  assert.equal(job?.location, 'Madurai, India')
})
