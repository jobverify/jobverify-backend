import assert from 'node:assert/strict'
import test from 'node:test'

import {
  APPLICATION_URL,
  extractRoleListings,
} from '../../scraper/bharatfinancialinclusionlimited/script.js'

test('extractRoleListings marks BFIL role listings as public experience checked', () => {
  const html = `
    <section>
      <h5>Microfinance Business Unit (MFI)</h5>
      <ul>
        <li>Field Assistant (Sangam Manager)</li>
        <li>Assistant Branch Manager</li>
      </ul>
      <p>If interested, please send us your application.</p>
      <p>[Vertical Name] / [Preferred Location] / [Role]</p>
      <p>Example: BSS / Mysore / Loan Officer</p>
    </section>
  `

  const jobs = extractRoleListings(html)

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Field Assistant (Sangam Manager)')
  assert.equal(jobs[0].applyUrl, APPLICATION_URL)
  assert.equal(jobs[0].publicExperienceChecked, true)
  assert.match(jobs[0].jobDescription, /Apply with subject format/i)
})
