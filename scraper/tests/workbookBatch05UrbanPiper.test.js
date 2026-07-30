import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BROWSE_ALL_JOBS_CTA,
  CAREERS_HEADING,
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  PRIMARY_CAREERS_COPY,
  SECONDARY_CAREERS_COPY,
  SOURCE,
  createUrbanPiperScraper,
  extractBrowseAllJobsTargets,
  run,
} from '../workbookbatch05/urbanpiper.js'

const VERIFIED_EXTERNAL_HANDOFF_HTML = `
  <html>
    <head>
      <title>${CAREERS_HEADING}</title>
    </head>
    <body>
      <main>
        <h1>${CAREERS_HEADING}</h1>
        <p>${PRIMARY_CAREERS_COPY}</p>
        <a href="https://jobs.example.com/urbanpiper?source=hero">${BROWSE_ALL_JOBS_CTA}</a>
        <section>
          <h2>${SECONDARY_CAREERS_COPY}</h2>
          <a href="https://jobs.example.com/urbanpiper?source=footer">${BROWSE_ALL_JOBS_CTA}</a>
        </section>
      </main>
    </body>
  </html>
`

test('UrbanPiper validates the verified browse-all-jobs handoff surface and stays fail-closed', async () => {
  let requestedUrl = null

  const jobs = await createUrbanPiperScraper().run({
    fetchPage: async (url) => {
      requestedUrl = url
      return {
        status: 200,
        url,
        html: VERIFIED_EXTERNAL_HANDOFF_HTML,
      }
    },
  })

  assert.equal(requestedUrl, CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.deepEqual(extractBrowseAllJobsTargets(VERIFIED_EXTERNAL_HANDOFF_HTML), [
    'https://jobs.example.com/urbanpiper?source=hero',
    'https://jobs.example.com/urbanpiper?source=footer',
  ])
  assert.equal(SOURCE, 'urbanpiper')
  assert.equal(COMPANY, 'UrbanPiper')
  assert.equal(DISPOSITION, 'verified-browse-all-jobs-handoff-sentinel')
  assert.deepEqual(
    await run({
      fetchPage: async () => ({
        status: 200,
        url: CAREERS_URL,
        html: VERIFIED_EXTERNAL_HANDOFF_HTML,
      }),
    }),
    [],
  )
})

test('UrbanPiper throws when the verified careers contract has drifted', async () => {
  await assert.rejects(
    createUrbanPiperScraper().run({
      fetchPage: async () => ({
        status: 404,
        url: CAREERS_URL,
        html: `
          <html>
            <head><title>Not Found</title></head>
            <body><main><h1>Not Found</h1></main></body>
          </html>
        `,
      }),
    }),
    /expected 200/i,
  )
})

test('UrbanPiper throws when a first-party browse-all-jobs listings page appears', async () => {
  await assert.rejects(
    run({
      fetchPage: async () => ({
        status: 200,
        url: CAREERS_URL,
        html: `
          <html>
            <body>
              <main>
                <h1>${CAREERS_HEADING}</h1>
                <p>${PRIMARY_CAREERS_COPY}</p>
                <section>
                  <h2>${SECONDARY_CAREERS_COPY}</h2>
                  <a href="/careers/open-roles">${BROWSE_ALL_JOBS_CTA}</a>
                </section>
              </main>
            </body>
          </html>
        `,
      }),
    }),
    /first-party jobs page/i,
  )
})
