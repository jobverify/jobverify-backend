import assert from 'node:assert/strict'
import test from 'node:test'

const loadSctimstModule = async () => {
  try {
    return await import('../../scraper/sreechitratirunalinstitute/script.js')
  } catch {
    assert.fail('Expected SCTIMST scraper module at ../../scraper/sreechitratirunalinstitute/script.js')
  }
}

const recruitmentHtml = `
  <div class="tab_content" id="job">
    <div class="jobOperContent">
      <table class="table table-xs">
        <thead>
          <tr>
            <th style="width:60%;background-color:#005894;color:white;">Active Notifications</th>
            <th style="width:22%;background-color:#005894;color:white;">Last Date &amp; Time</th>
            <th style="width:14%;background-color:#005894;color:white;"></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <b>Notification - Recruitment to the post of Director</b>
              <a target="_blank" href="https://www.sctimst.ac.in/resources/director-english.pdf">(English)</a>
              <a target="_blank" href="https://www.sctimst.ac.in/resources/director-hindi.pdf">(Hindi)</a>
              <img src="/images/new_4.gif" alt="New" border="0">
            </td>
            <td>10.07.2026</td>
            <td></td>
          </tr>
          <tr>
            <td>
              <a target="_blank" href="Online Recruitment/">
                Online Recruitment - JSSC 2024 (Various Permanent Posts)
              </a>
              <img src="/images/new_4.gif" alt="New" border="0">
            </td>
            <td>15.04.2024</td>
            <td></td>
          </tr>
          <tr>
            <td>
              PROJECT ASSISTANT (CLERICAL) - P.7466
              <a target="_blank" href="RESOURCES/B_2026-27_1006.pdf"><span><b>[Notification]</b></span></a>
              <img src="/images/new_4.gif" alt="New" border="0" />
              <a target="_blank" href="https://rect.sctimst.ac.in/activeNotification"><span><b>Apply now</b></span></a>
            </td>
            <td>on or before 23.07.2026</td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <div>Recruitment Conducted</div>
    </div>
  </div>
  <div>
    Public Alert - Fake Recruitment Notifications in the Name of SCTIMST
  </div>
`

test('SCTIMST validates the official recruitment surface and normalizes active notifications', async () => {
  const sctimst = await loadSctimstModule()

  assert.equal(sctimst.RECRUITMENT_URL, 'https://www.sctimst.ac.in/recruitment/')
  assert.equal(sctimst.SOURCE, 'sreechitratirunalinstitute')
  assert.equal(typeof sctimst.hasOfficialRecruitmentSignal, 'function')
  assert.equal(typeof sctimst.extractActiveNotifications, 'function')
  assert.equal(typeof sctimst.createSreeChitraTirunalInstituteScraper, 'function')
  assert.equal(typeof sctimst.run, 'function')

  assert.equal(sctimst.hasOfficialRecruitmentSignal(recruitmentHtml), true)
  assert.deepEqual(sctimst.extractActiveNotifications(recruitmentHtml), [
    {
      title: 'Notification - Recruitment to the post of Director',
      company: 'Sree Chitra Tirunal Institute for Medical Sciences and Technology',
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: 'sreechitratirunalinstitute-notification-recruitment-to-the-post-of-director',
      requisitionId: 'notification-recruitment-to-the-post-of-director',
      sourceUrl: 'https://www.sctimst.ac.in/resources/director-english.pdf',
      applyUrl: 'https://www.sctimst.ac.in/resources/director-english.pdf',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: '2026-07-10T00:00:00.000Z',
      jobDescription: 'Official SCTIMST recruitment notification. Review the official notice for eligibility, selection process, and application instructions.',
    },
    {
      title: 'Online Recruitment - JSSC 2024 (Various Permanent Posts)',
      company: 'Sree Chitra Tirunal Institute for Medical Sciences and Technology',
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: 'sreechitratirunalinstitute-jssc-2024',
      requisitionId: 'jssc-2024',
      sourceUrl: 'https://www.sctimst.ac.in/recruitment/Online%20Recruitment/',
      applyUrl: 'https://www.sctimst.ac.in/recruitment/Online%20Recruitment/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: '2024-04-15T00:00:00.000Z',
      jobDescription: 'Official SCTIMST recruitment notification. Review the official notice for eligibility, selection process, and application instructions.',
    },
    {
      title: 'PROJECT ASSISTANT (CLERICAL) - P.7466',
      company: 'Sree Chitra Tirunal Institute for Medical Sciences and Technology',
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: 'sreechitratirunalinstitute-p-7466',
      requisitionId: 'p-7466',
      sourceUrl: 'https://www.sctimst.ac.in/recruitment/RESOURCES/B_2026-27_1006.pdf',
      applyUrl: 'https://rect.sctimst.ac.in/activeNotification',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: '2026-07-23T00:00:00.000Z',
      jobDescription: 'Official SCTIMST recruitment notification. Review the official notice for eligibility, selection process, and application instructions.',
    },
  ])
})

test('SCTIMST run fetches the official recruitment page and decorates the normalized records', async () => {
  const sctimst = await loadSctimstModule()
  const requestedUrls = []

  const jobs = await sctimst.createSreeChitraTirunalInstituteScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return recruitmentHtml
    },
    now: () => '2026-07-10T08:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [sctimst.RECRUITMENT_URL])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'sreechitratirunalinstitute')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-10T08:00:00.000Z')
})
