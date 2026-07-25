import assert from 'node:assert/strict'
import test from 'node:test'

import {
  APPLY_URL,
  CAREERS_URL,
  createSahajanandTechnologiesPrivateLimitedStplScraper,
  extractJobCards,
  extractJobDetail,
  hasOfficialCareersSignal,
} from './script.js'

const openingsHtml = `
<!doctype html>
<html lang="en-in">
<head>
  <title>Current Openings | (SLTL) Sahajanand Laser Technology Ltd</title>
  <link rel="canonical" href="https://www.sltl.com/current-openings/" />
  <meta property="og:site_name" content="SLTL Group&reg;" />
</head>
<body>
  <h2>Current Openings</h2>
  <div class="career-list show-only-three ptb-20 pb-0">
    <div class="items" data-experience="5–8 years" data-department="Production" data-designation="Sr Engineer / Asst Manager" data-tion="Gandhinagar">
      <div class="card-career d-flex">
        <div class="left-block">
          <h3 class="career-tl"><a href="https://www.sltl.com/careers/sr-engineer-store-a8-sltl-gandhinagar/" title="Sr Engineer &#8211; Store &#8211; A8 &#8211; SLTL Gandhinagar">Sr Engineer &#8211; Store &#8211; A8 &#8211; SLTL Gandhinagar</a></h3>
          <p class="opening-text d-flex"><strong class="label">Designation:</strong><span class="value">Sr Engineer / Asst Manager </span></p>
          <p class="opening-text d-flex"><strong class="label">Location:</strong><span class="value">Gandhinagar </span></p>
          <p class="opening-text d-flex"><strong class="label">Reporting Manager:</strong><span class="value">Manager</span></p>
          <p class="opening-text d-flex"><strong class="label">Products:</strong><span class="value">SLTL Group - Medical Devices</span></p>
          <p class="opening-text d-flex"><strong class="label">Edu. Qualification:</strong><span class="value">Graduate in any discipline. Preferred: Diploma/PG in Materials Management or SCM</span></p>
          <p class="opening-text d-flex"><strong class="label">Experience:</strong><span class="value">5–8 years Years</span></p>
        </div>
      </div>
    </div>
    <div class="items" data-experience="2 to 8 Years" data-department="Production" data-designation="Production Engineer" data-tion="Gandhinagar">
      <div class="card-career d-flex">
        <div class="left-block">
          <h3 class="career-tl"><a href="https://www.sltl.com/careers/production-engineer-medical-devices-sltl-gandhinagar/" title="Production Engineer &#8211; Medical Devices &#8211; SLTL Gandhinagar">Production Engineer &#8211; Medical Devices &#8211; SLTL Gandhinagar</a></h3>
          <p class="opening-text d-flex"><strong class="label">Designation:</strong><span class="value">Production Engineer</span></p>
          <p class="opening-text d-flex"><strong class="label">Location:</strong><span class="value">Gandhinagar </span></p>
          <p class="opening-text d-flex"><strong class="label">Products:</strong><span class="value">SLTL Group - Medical Devices</span></p>
          <p class="opening-text d-flex"><strong class="label">Edu. Qualification:</strong><span class="value">Diploma / B.E / B.Tech – Mechanical / Production / Industrial Engineering</span></p>
          <p class="opening-text d-flex"><strong class="label">Experience:</strong><span class="value">2 to 8 Years Years</span></p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`

const detailHtml = `
<!doctype html>
<html lang="en-in">
<head>
  <title>Production Engineer - Medical Devices - SLTL Gandhinagar - SLTL Group&reg;</title>
  <link rel="canonical" href="https://www.sltl.com/careers/production-engineer-medical-devices-sltl-gandhinagar/" />
  <meta property="og:site_name" content="SLTL Group&reg;" />
  <meta property="og:description" content="🔧 Job Title: Production Engineer 📍 Location: Gandhinagar, Gujarat 🏢 Company: Sahajanand Laser Technology Ltd. (SLTL Group) &#8211; Medical Division 🌐 Website: www.sltlmedical.com 🕒 Experience: 0.6 – 2 Years 🎓 Qualification: Diploma / B.E / B.Tech – Mechanical / Production / Industrial Engineering" />
</head>
<body>
  <div class="sticky-block">
    <a class="btn secondary small btn-arrow" href="/contact-us/#contactTab5" title="Apply Now">
      <span class="btn-text trans">Apply Now</span>
    </a>
  </div>
  <div class="left-main-content">
    <div class="career-top-block ptb-20 pt-0 mb-0 d-flex">
      <div class="left-block">
        <h2 class="career-tl">Production Engineer &#8211; Medical Devices &#8211; SLTL Gandhinagar</h2>
        <p class="opening-text d-flex"><strong class="label">Designation:</strong><span class="value">Production Engineer</span></p>
        <p class="opening-text d-flex"><strong class="label">Location:</strong><span class="value">Gandhinagar </span></p>
        <p class="opening-text d-flex"><strong class="label">Edu. Qualification:</strong><span class="value">Diploma / B.E / B.Tech – Mechanical / Production / Industrial Engineering</span></p>
        <p class="opening-text d-flex"><strong class="label">Experience:</strong><span class="value">2 to 8 Years Years</span></p>
      </div>
    </div>
    <div class="career-content entry-content ptb-20 pb-0">
      <p>🔧 Job Title: Production Engineer<br />
      📍 Location: Gandhinagar, Gujarat<br />
      🏢 Company: Sahajanand Laser Technology Ltd. (SLTL Group) &#8211; Medical Division<br />
      🌐 Website: www.sltlmedical.com<br />
      🕒 Experience: 0.6 – 2 Years<br />
      🎓 Qualification: Diploma / B.E / B.Tech – Mechanical / Production / Industrial Engineering</p>
    </div>
  </div>
</body>
</html>
`

test('hasOfficialCareersSignal verifies the official SLTL current openings page', () => {
  assert.equal(CAREERS_URL, 'https://www.sltl.com/current-openings/')
  assert.equal(APPLY_URL, 'https://www.sltl.com/contact-us/#contactTab5')
  assert.equal(hasOfficialCareersSignal(openingsHtml), true)
  assert.equal(hasOfficialCareersSignal('<html><head><title>Jobs</title></head><body>Unknown</body></html>'), false)
})

test('extractJobCards parses the current openings cards from the official SLTL page', () => {
  const cards = extractJobCards(openingsHtml)

  assert.equal(cards.length, 2)
  assert.deepEqual(cards[0], {
    title: 'Sr Engineer - Store - A8 - SLTL Gandhinagar',
    sourceUrl: 'https://www.sltl.com/careers/sr-engineer-store-a8-sltl-gandhinagar/',
    designation: 'Sr Engineer / Asst Manager',
    location: 'Gandhinagar',
    reportingManager: 'Manager',
    products: 'SLTL Group - Medical Devices',
    minimumQualification: 'Graduate in any discipline. Preferred: Diploma/PG in Materials Management or SCM',
    experienceRequired: '5-8 years Years',
  })
})

test('extractJobDetail parses the official SLTL detail page and keeps the first-party apply handoff', () => {
  const detail = extractJobDetail(detailHtml)

  assert.deepEqual(detail, {
    title: 'Production Engineer - Medical Devices - SLTL Gandhinagar',
    designation: 'Production Engineer',
    location: 'Gandhinagar',
    minimumQualification: 'Diploma / B.E / B.Tech - Mechanical / Production / Industrial Engineering',
    experienceRequired: '2 to 8 Years Years',
    jobDescription: 'Job Title: Production Engineer Location: Gandhinagar, Gujarat Company: Sahajanand Laser Technology Ltd. (SLTL Group) - Medical Division Website: www.sltlmedical.com Experience: 0.6 - 2 Years Qualification: Diploma / B.E / B.Tech - Mechanical / Production / Industrial Engineering',
    applyUrl: APPLY_URL,
  })
})

test('run fetches the SLTL openings page, follows detail pages, and returns normalized jobs', async () => {
  const requestedUrls = []
  const scraper = createSahajanandTechnologiesPrivateLimitedStplScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === CAREERS_URL) {
        return openingsHtml
      }

      if (url === 'https://www.sltl.com/careers/sr-engineer-store-a8-sltl-gandhinagar/') {
        return detailHtml.replaceAll('Production Engineer', 'Sr Engineer')
          .replaceAll('production-engineer-medical-devices-sltl-gandhinagar', 'sr-engineer-store-a8-sltl-gandhinagar')
          .replaceAll('Production Engineer - Medical Devices - SLTL Gandhinagar', 'Sr Engineer - Store - A8 - SLTL Gandhinagar')
          .replaceAll('Diploma / B.E / B.Tech - Mechanical / Production / Industrial Engineering', 'Graduate in any discipline. Preferred: Diploma/PG in Materials Management or SCM')
          .replaceAll('2 to 8 Years Years', '5-8 years Years')
          .replaceAll('0.6 - 2 Years', '5-8 years')
      }

      if (url === 'https://www.sltl.com/careers/production-engineer-medical-devices-sltl-gandhinagar/') {
        return detailHtml
      }

      throw new Error(`Unexpected URL ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    CAREERS_URL,
    'https://www.sltl.com/careers/sr-engineer-store-a8-sltl-gandhinagar/',
    'https://www.sltl.com/careers/production-engineer-medical-devices-sltl-gandhinagar/',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].company, 'Sahajanand Laser Technology Ltd. (SLTL Group)')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].city, 'Gandhinagar')
  assert.equal(jobs[0].applyUrl, APPLY_URL)
  assert.equal(jobs[0].source, 'sahajanandtechnologiesprivatelimitedstpl')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
})
