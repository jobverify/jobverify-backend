import assert from 'node:assert/strict'
import test from 'node:test'

import { extractWorkdayJobDetail } from '../detailExtractors/workday.js'

test('extractWorkdayJobDetail prefers real desired experience over company-history years in Workday JSON-LD', () => {
  const html = `
    <html>
      <body>
        <script type="application/ld+json">
          {
            "@type": "JobPosting",
            "description": "Who are we and what do we do? BrowserStack is the world’s leading cloud-based software testing platform. Recognized for its innovation and growth, BrowserStack has been named to the Forbes Cloud 100 list for four consecutive years. Desired Experience: 6+ years of hands-on and strategic SEO experience, preferably in SaaS or B2B category."
          }
        </script>
      </body>
    </html>
  `

  const detail = extractWorkdayJobDetail(html)

  assert.equal(detail.experienceRequired, '6+ years')
})

test('extractWorkdayJobDetail ignores employer-tenure prose when a later Workday experience range is present', () => {
  const html = `
    <html>
      <body>
        <script type="application/ld+json">
          {
            "@type": "JobPosting",
            "description": "At Allstate, great things happen when our people work together to protect families and their belongings from life’s uncertainties. And for more than 90 years, our innovative drive has kept us a step ahead of our customers’ evolving needs. Job Description RESPONSIBILITIES: Support claims workflows. Experience 1-4 years experience (Preferred)."
          }
        </script>
      </body>
    </html>
  `

  const detail = extractWorkdayJobDetail(html)

  assert.equal(detail.experienceRequired, '1-4 years')
})

test('extractWorkdayJobDetail preserves mixed month-to-year experience ranges from Workday descriptions', () => {
  const html = `
    <html>
      <body>
        <script type="application/ld+json">
          {
            "@type": "JobPosting",
            "description": "Who are we and what do we do? BrowserStack is the world’s leading cloud-based software testing platform. Recognized for its innovation and growth, BrowserStack has been named to the Forbes Cloud 100 list for four consecutive years. Preferred Qualifications: 5 months - 2 years of Sales/Business Development experience with B2B corporate sales experience."
          }
        </script>
      </body>
    </html>
  `

  const detail = extractWorkdayJobDetail(html)

  assert.equal(detail.experienceRequired, '5 months - 2 years')
})

test('extractWorkdayJobDetail captures Workday posted-on text from the detail header', () => {
  const html = `
    <html>
      <body>
        <div data-automation-id="postedOn">
          <dl>
            <dt>posted on</dt>
            <dd>Posted 30+ Days Ago</dd>
          </dl>
        </div>
      </body>
    </html>
  `

  const detail = extractWorkdayJobDetail(html)

  assert.equal(detail.postingDate, 'Posted 30+ Days Ago')
})

test('extractWorkdayJobDetail falls back to Workday JSON-LD datePosted when the visible posted-on block is absent', () => {
  const html = `
    <html>
      <body>
        <script type="application/ld+json">
          {
            "@type": "JobPosting",
            "datePosted": "2026-06-12",
            "description": "Required Experience Five to ten years of experience as Gold Loan sales in Bank/NBFC"
          }
        </script>
      </body>
    </html>
  `

  const detail = extractWorkdayJobDetail(html)

  assert.equal(detail.postingDate, '2026-06-12')
  assert.equal(detail.experienceRequired, '5 to 10 years')
})
