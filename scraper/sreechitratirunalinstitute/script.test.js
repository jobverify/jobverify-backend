import assert from 'node:assert/strict'
import test from 'node:test'

import {
  RECRUITMENT_URL,
  SOURCE,
  createSreeChitraTirunalInstituteScraper,
  extractActiveNotifications,
  hasOfficialRecruitmentSignal,
} from './script.js'

const recruitmentHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Sree Chitra Tirunal Institute for Medical Sciences and Technology, Trivandrum (SCTIMST)</title>
    </head>
    <body>
      <p>Fake Recruitment Notifications in the Name of SCTIMST</p>
      <h2>Active Notifications</h2>
      <table>
        <caption>Active Notifications</caption>
        <tr>
          <th>Notification</th>
          <th>Last Date &amp; Time</th>
        </tr>
        <tr>
          <td>
            <b>Project Assistant (P. 12)</b>
            <a href="/recruitment/project-assistant-notice.pdf">Notification</a>
            <a href="/recruitment/project-assistant-apply">Apply Now</a>
          </td>
          <td>31.08.2026</td>
        </tr>
      </table>
      <section>
        <h3>Recruitment Conducted</h3>
      </section>
    </body>
  </html>
`

test('SCTIMST helpers recognize the verified recruitment surface and normalize active notification rows', () => {
  assert.equal(SOURCE, 'sreechitratirunalinstitute')
  assert.equal(RECRUITMENT_URL, 'https://www.sctimst.ac.in/recruitment/')
  assert.equal(hasOfficialRecruitmentSignal(recruitmentHtml), true)
  assert.deepEqual(extractActiveNotifications(recruitmentHtml), [{
    title: 'Project Assistant (P. 12)',
    company: 'Sree Chitra Tirunal Institute for Medical Sciences and Technology',
    department: null,
    location: 'India',
    city: null,
    country: 'India',
    jobId: 'sreechitratirunalinstitute-p-12',
    requisitionId: 'p-12',
    sourceUrl: 'https://www.sctimst.ac.in/recruitment/project-assistant-notice.pdf',
    applyUrl: 'https://www.sctimst.ac.in/recruitment/project-assistant-apply',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: '2026-08-31T00:00:00.000Z',
    jobDescription: 'Official SCTIMST recruitment notification. Review the official notice for eligibility, selection process, and application instructions.',
    publicExperienceChecked: true,
  }])
})

test('SCTIMST default recruitment fetch uses a 60 second timeout budget so the official page can finish loading', async () => {
  const originalFetch = globalThis.fetch
  const originalTimeout = AbortSignal.timeout
  const timeoutMs = []
  const timeoutSignals = []
  const requestedUrls = []

  AbortSignal.timeout = (ms) => {
    timeoutMs.push(ms)
    const signal = new AbortController().signal
    timeoutSignals.push(signal)
    return signal
  }

  globalThis.fetch = async (url, options = {}) => {
    requestedUrls.push(String(url))
    const expectedSignal = timeoutSignals.at(-1)
    assert.ok(expectedSignal, 'expected default fetch to request a timeout signal')
    assert.equal(options.signal, expectedSignal)

    return {
      ok: true,
      status: 200,
      url,
      headers: { get: () => 'text/html; charset=utf-8' },
      text: async () => recruitmentHtml,
    }
  }

  try {
    const jobs = await createSreeChitraTirunalInstituteScraper({ maxJobs: 1 }).run({
      now: () => '2026-08-20T18:30:00.000Z',
    })

    assert.deepEqual(requestedUrls, [RECRUITMENT_URL])
    assert.deepEqual(timeoutMs, [60000])
    assert.equal(jobs.length, 1)
    assert.equal(jobs[0].source, SOURCE)
    assert.equal(jobs[0].scrapedAt, '2026-08-20T18:30:00.000Z')
  } finally {
    globalThis.fetch = originalFetch
    AbortSignal.timeout = originalTimeout
  }
})
