import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../../scraper/sreechitratirunalinstitute/script.js')
  } catch {
    assert.fail('Expected SCTIMST scraper module at ../../scraper/sreechitratirunalinstitute/script.js')
  }
}

const officialRecruitmentHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Recruitment | SCTIMST</title>
  </head>
  <body>
    <p>Fake Recruitment Notifications in the Name of SCTIMST</p>
    <table>
      <tr>
        <th>Active Notifications</th>
        <th>Last Date &amp; Time</th>
      </tr>
      <tr>
        <td>
          <b>Notification - Recruitment to the post of Director</b>
          <a href="/resources/director-notification.pdf">View Notice</a>
        </td>
        <td>10.08.2026</td>
      </tr>
      <tr>
        <td>
          <b>PROJECT TECHNICAL SUPPORT II - TEMPORARY - P.5517</b>
          <a href="/recruitment/resources/p5517-notice.pdf">Notification</a>
          <a href="/recruitment/resources/p5517-apply.pdf">Apply Now</a>
        </td>
        <td>18.08.2026</td>
      </tr>
    </table>
    <section>
      <h2>Recruitment Conducted</h2>
    </section>
  </body>
</html>
`

test('SCTIMST validates the verified official recruitment table and marks notifications as checked', async () => {
  const sctimst = await loadModule()

  assert.equal(sctimst.SOURCE, 'sreechitratirunalinstitute')
  assert.equal(sctimst.hasOfficialRecruitmentSignal(officialRecruitmentHtml), true)

  const jobs = sctimst.extractActiveNotifications(officialRecruitmentHtml)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Notification - Recruitment to the post of Director',
    company: 'Sree Chitra Tirunal Institute for Medical Sciences and Technology',
    department: null,
    location: 'India',
    city: null,
    country: 'India',
    jobId: 'sreechitratirunalinstitute-notification-recruitment-to-the-post-of-director',
    requisitionId: 'notification-recruitment-to-the-post-of-director',
    sourceUrl: 'https://www.sctimst.ac.in/resources/director-notification.pdf',
    applyUrl: 'https://www.sctimst.ac.in/resources/director-notification.pdf',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: '2026-08-10T00:00:00.000Z',
    jobDescription: 'Official SCTIMST recruitment notification. Review the official notice for eligibility, selection process, and application instructions.',
    publicExperienceChecked: true,
  })
  assert.ok(jobs.every((job) => job.publicExperienceChecked === true))
})

test('SCTIMST run decorates verified notifications with shared metadata', async () => {
  const sctimst = await loadModule()
  const requestedUrls = []

  const jobs = await sctimst.createSreeChitraTirunalInstituteScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === sctimst.RECRUITMENT_URL) return officialRecruitmentHtml
      throw new Error(`Unexpected SCTIMST URL: ${url}`)
    },
    now: () => '2026-08-06T12:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [sctimst.RECRUITMENT_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, sctimst.SOURCE)
  assert.equal(jobs[0].scrapedAt, '2026-08-06T12:00:00.000Z')
  assert.ok(jobs.every((job) => job.publicExperienceChecked === true))
})
