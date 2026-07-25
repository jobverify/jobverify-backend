import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_PAGE_URL,
  createJacobAiScraper,
  hasJacobAiDomainForSaleSignal,
  hasJacobAiNoJobsSignal,
} from './script.js'

const parkedDomainHtml = `
  <html>
    <body>
      <main>
        <h1>jacob.ai</h1>
        <p>Domain for sale</p>
        <p>Listed with spaceship.com</p>
        <p>Make offer</p>
        <p>Buyer protection program</p>
      </main>
    </body>
  </html>
`

test('detects the Jacob AI parked-domain no-jobs surface', () => {
  assert.equal(CAREER_PAGE_URL, 'https://jacob.ai/')
  assert.equal(hasJacobAiDomainForSaleSignal(parkedDomainHtml), true)
  assert.equal(hasJacobAiNoJobsSignal(parkedDomainHtml), true)
})

test('run returns no jobs only while the official Jacob AI domain remains a parked for-sale page', async () => {
  const jobs = await createJacobAiScraper().run({
    fetchText: async (url) => {
      assert.equal(url, CAREER_PAGE_URL)
      return parkedDomainHtml
    },
  })

  assert.deepEqual(jobs, [])
})

test('run fails closed when the public Jacob AI surface drifts away from the verified parked-domain state', async () => {
  await assert.rejects(
    () => createJacobAiScraper().run({
      fetchText: async () => `
        <html>
          <body>
            <h1>Jacob AI</h1>
            <p>Careers</p>
            <a href="/jobs">Open roles</a>
          </body>
        </html>
      `,
    }),
    /Jacob AI public site no longer matches the verified parked-domain state/,
  )
})
