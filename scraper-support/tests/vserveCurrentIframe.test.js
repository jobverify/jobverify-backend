import assert from 'node:assert/strict'
import test from 'node:test'

import { extractEmbeddedZohoPortalUrl, hasOfficialCareersSignal } from '../../scraper/vserveebusinesssolutions/script.js'

test('Vserve accepts the current eager first-party Zoho iframe and decodes its query string', () => {
  const html = `
    <title>Current Job Openings and Opportunities in Vserve Ebusiness Solutions</title>
    <link rel="canonical" href="https://vservesolution.com/careers/">
    <nav><a href="/careers/">Careers</a></nav><h1>Where Ambition Meets Opportunity.</h1>
    <a href="mailto:jobopenings@vservesolution.com">job inquiries</a>
    <iframe src="https://recruit.zoho.com/recruit/Portal.na?iframe=false&amp;digest=current-token"></iframe>
  `
  assert.equal(hasOfficialCareersSignal(html), true)
  assert.equal(extractEmbeddedZohoPortalUrl(html), 'https://recruit.zoho.com/recruit/Portal.na?iframe=false&digest=current-token')
})

test('Vserve does not trust an arbitrary iframe or company-shaped marketing page', () => {
  assert.equal(hasOfficialCareersSignal('<h1>Where Ambition Meets Opportunity.</h1><iframe src="https://evil.example/jobs"></iframe>'), false)
})
