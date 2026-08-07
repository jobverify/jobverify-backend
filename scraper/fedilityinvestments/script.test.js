import assert from 'node:assert/strict'
import test from 'node:test'

import {
  JOBS_PAGE_URL,
  JOBS_XML_URL,
  createDefaultFetchText,
  createFedilityInvestmentsScraper,
  hasOfficialJobsFeedSignal,
  hasOfficialJobsPageSignal,
} from './script.js'

const cloudflareChallengeHtml = `
  <!doctype html>
  <html lang="en-US">
    <head>
      <title>Just a moment...</title>
    </head>
    <body>
      <main>
        <h1>Just a moment...</h1>
        <p>Enable JavaScript and cookies to continue</p>
        <p>jobs.fidelity.com needs to review the security of your connection before proceeding.</p>
      </main>
    </body>
  </html>
`

const jobsXml = `
  <?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>Fidelity Investments Careers</title>
      <publisher>Fidelity Investments Careers</publisher>
      <publisherUrl>https://jobs.fidelity.com</publisherUrl>
      <job>
        <title><![CDATA[Data Scientist]]></title>
        <url><![CDATA[https://jobs.fidelity.com/in/jobs/2133239/data-scientist/]]></url>
        <apijobid><![CDATA[2133239]]></apijobid>
        <requisitionid><![CDATA[2133239]]></requisitionid>
        <company><![CDATA[Fidelity Investments]]></company>
        <category><![CDATA[Technology]]></category>
        <city><![CDATA[Bangalore]]></city>
        <state><![CDATA[Karnataka]]></state>
        <country><![CDATA[IN]]></country>
        <jobtype><![CDATA[Regular Full Time]]></jobtype>
        <date><![CDATA[2026-07-29T09:00:00Z]]></date>
        <description><![CDATA[
          <p>Build production ML systems.</p>
          <ul>
            <li>Python</li>
            <li>Machine Learning</li>
          </ul>
        ]]></description>
      </job>
    </channel>
  </rss>
`

test('Fedility Investments accepts the current Cloudflare challenge page and skips curl fallback on 403', async () => {
  let curlCalled = false

  const fetchText = createDefaultFetchText({
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      text: async () => cloudflareChallengeHtml,
    }),
    execFileImpl: () => {
      curlCalled = true
      throw new Error('curl should not run for the verified Cloudflare challenge page')
    },
  })

  const html = await fetchText(JOBS_PAGE_URL)

  assert.equal(html, cloudflareChallengeHtml)
  assert.equal(curlCalled, false)
  assert.equal(hasOfficialJobsPageSignal(cloudflareChallengeHtml), true)
})

test('Fedility Investments run validates the current challenge page and still extracts jobs from the XML feed', async () => {
  const requestedUrls = []

  assert.equal(hasOfficialJobsFeedSignal(jobsXml), true)

  const jobs = await createFedilityInvestmentsScraper({
    now: () => '2026-08-02T04:30:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === JOBS_PAGE_URL) return cloudflareChallengeHtml
      if (url === JOBS_XML_URL) return jobsXml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [JOBS_PAGE_URL, JOBS_XML_URL])
  assert.equal(jobs.length, 1)
  assert.deepEqual(
    {
      title: jobs[0].title,
      company: jobs[0].company,
      location: jobs[0].location,
      jobId: jobs[0].jobId,
      link: jobs[0].link,
      source: jobs[0].source,
      scrapedAt: jobs[0].scrapedAt,
    },
    {
      title: 'Data Scientist',
      company: 'Fidelity Investments',
      location: 'Bangalore, Karnataka, India',
      jobId: '2133239',
      link: 'https://jobs.fidelity.com/in/jobs/2133239/data-scientist/',
      source: 'fedilityinvestments',
      scrapedAt: '2026-08-02T04:30:00.000Z',
    },
  )
})
