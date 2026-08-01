import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  createMobiKwikScraper,
  hasExternalJobsHandoffSignal,
  hasOfficialCareersSignal,
} from '../../scraper/mobikwik/script.js'

const officialCareersHtml = `
  <!doctype html>
  <html lang="en">
    <body>
      <main>
        <div>MobiKwik</div>
        <h1>Work @ MobiKwik Benefits</h1>
        <p>Want to empower millions of Indians with financial Independence?</p>
        <h2>View Job Openings</h2>
        <p>Ready To Work Together?</p>
        <a href="https://www.linkedin.com/company/mobikwik/jobs/">View Jobs on LinkedIn</a>
        <a href="https://www.naukri.com/mobikwik-jobs-careers-553841">View Jobs on Naukri</a>
        <p>Email us at ta@mobikwik.com</p>
      </main>
      <footer>© 2026 One MobiKwik Systems Limited</footer>
    </body>
  </html>
`

test('MobiKwik validates the official careers surface and external jobs handoff before returning no verified listings', async () => {
  const requestedUrls = []

  assert.equal(hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(hasExternalJobsHandoffSignal(officialCareersHtml), true)

  const jobs = await createMobiKwikScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return officialCareersHtml
    },
  })

  assert.deepEqual(requestedUrls, [CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('MobiKwik fails closed when the official careers surface changes', async () => {
  await assert.rejects(
    createMobiKwikScraper().run({
      fetchText: async () => '<html><title>Unexpected</title></html>',
    }),
    /MobiKwik official careers surface changed/i,
  )

  await assert.rejects(
    createMobiKwikScraper().run({
      fetchText: async () => `
        <html>
          <body>
            <div>MobiKwik</div>
            <h1>Work @ MobiKwik Benefits</h1>
            <p>View Job Openings</p>
            <p>Ready To Work Together?</p>
            <p>No external handoff links available.</p>
          </body>
        </html>
      `,
    }),
    /MobiKwik careers handoff changed/i,
  )
})
