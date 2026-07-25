import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_PAGE_URL,
  TALENT_APPLY_HOST,
  createRaremindsScraper,
  hasNoPublicListingsSignal,
  hasOfficialSiteSignal,
} from '../rareminds/script.js'

const verifiedHomepageHtml = `
  <html>
    <head>
      <title>Rareminds</title>
    </head>
    <body>
      <h1>Unlisted talent. Confidential roles.</h1>
      <p>We operate off-grid - sourcing minds too sharp for the spotlight.</p>
      <a href="https://${TALENT_APPLY_HOST}/shrExampleTalentForm">Apply as Talent</a>
      <p>You don't need a resume. You need a reason.</p>
      <h2>Fixers, not Recruiters</h2>
      <p>We primarily serve forward-thinking organizations, but exceptional talent is occasionally admitted to our network through trusted referrals.</p>
      <p>The most brilliant minds don't apply-they're discovered.</p>
    </body>
  </html>
`

test('Rareminds scraper targets the official homepage and recognizes the verified talent-application sentinel', () => {
  assert.equal(CAREER_PAGE_URL, 'https://rareminds.com/')
  assert.equal(TALENT_APPLY_HOST, 'airtable.com')
  assert.equal(hasOfficialSiteSignal(verifiedHomepageHtml), true)
  assert.equal(hasNoPublicListingsSignal(verifiedHomepageHtml), true)
})

test('run returns no jobs when Rareminds only exposes its official talent application flow', async () => {
  const requestedUrls = []
  const jobs = await createRaremindsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, CAREER_PAGE_URL)
      return verifiedHomepageHtml
    },
  })

  assert.deepEqual(requestedUrls, [CAREER_PAGE_URL])
  assert.deepEqual(jobs, [])
})

test('run fails closed when the Rareminds public surface changes', async () => {
  await assert.rejects(
    createRaremindsScraper().run({
      fetchText: async () => '<html><title>Unexpected</title></html>',
    }),
    /verified official public surface/i,
  )

  await assert.rejects(
    createRaremindsScraper().run({
      fetchText: async () => `
        <html>
          <head><title>Rareminds</title></head>
          <body>
            <h1>Unlisted talent. Confidential roles.</h1>
            <a href="https://${TALENT_APPLY_HOST}/shrExampleTalentForm">Apply as Talent</a>
            <p>Open roles in Bangalore</p>
          </body>
        </html>
      `,
    }),
    /no-public-listings surface/i,
  )
})
