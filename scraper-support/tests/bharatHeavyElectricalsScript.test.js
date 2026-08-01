import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-15T00:00:00.000Z'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Official Website of Bharat Heavy Electricals Limited, New Delhi, India |</title>
  </head>
  <body>
    <main>
      <h3 class="main_menu">Career with BHEL</h3>
      <ul class="list-unstyled">
        <li><a href="https://careers.bhel.in/index.jsp" target="_blank">Working at BHEL</a></li>
        <li><a href="https://careers.bhel.in/index.jsp" target="_blank">Current Job Openings</a></li>
      </ul>
    </main>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html>
  <head>
  </head>
  <body id="myPage">
    <button title="BHEL Careers Portal">BHEL Careers Portal</button>
    <div class="w3-row-padding w3-padding-64 w3-center" id="openings">
      <h2>Current Openings ( वर्तमान रिक्तियां)</h2>
      <div style="text-align:left;" class="w3-row-padding w3-card-8">
        <table>
          <tr class="stdh">
            <td><span class="lrgblb"><strong>Regular Recruitment</strong></span></td>
          </tr>
        </table>
        <br/>
        <img src="arrow3.gif"><a href="#"><b>Artisan Recruitment - 2025</b></a><br/>
        <ul>
          <li><a href="ar_2025/Artisan_Detailed AD_110825.pdf">Detailed Advertisement</a></li>
          <li><a href="https://cdn.digialm.com//EForms/configuredHtml/1258/94876/Index.html">Apply Online</a></li>
        </ul>

        <br/>
        <img src="arrow3.gif"><a href="#"><b>Recruitment of Engineer Trainees &amp; Supervisor Trainees - 2025</b></a><br/>
        <ul>
          <li><a href="et_st_2025/ET &amp; ST -2025 _Detailed Advertisement.pdf">Detailed Advertisement</a></li>
          <li><a href="https://secure-web.cisco.com/1p7fo3vrqiBj3ZL_Gr0UZbkjo4mPqBizZpYUyqFi1_4f-_dLJYMR_pLNSIbIUQKpT90kmsG6wd3Ks6_4r4JEfgIk-4BuE7NgYd_x-yZeEBhvXGtN4bTA1CeiMSa_eTiymt9N_60WeosIaJ6DTVJ-PXJJ2dvTZu2zRK1Kz31BS53J97KHKE5hh0VaQcg1ngcHzia5n7_uWvC4oLU-xBqKjjImZ1faB-CIh7vgV_DPNIAMERF40FGhkFpk7zKKJXmW8xqrMPJT9jix_ghF_96Ryx-K9VmYQXtgxiXdB6dZz_UG1nP0zo23FzzhF7zIfuYis/https%3A%2F%2Fcdn.digialm.com%2F%2FEForms%2FconfiguredHtml%2F1258%2F92788%2FIndex.html">Apply Online</a></li>
        </ul>

        <table>
          <tr class="stdh">
            <td><span class="lrgblb"><strong>Recruitment of Consultants/Experts/Deputation</strong></span></td>
          </tr>
        </table>
        <br/>
        <img src="arrow3.gif"><a href="https://careers1.bhel.in/lateral2020/jsp/et_eng_index.jsp"><b>Engagement of Senior Consultant for Kasturba Hospital at BHEL, Bhopal</b></a><br/>

        <table>
          <tr class="stdh">
            <td><span class="lrgblb"><strong>Recruitment of FTA/ Part-Time positions</strong></span></td>
          </tr>
        </table>
        <br/>
        <img src="arrow3.gif"><b>Engagement of Engineers and Supervisors on Fixed Tenure Appointment (FTA) basis for SBD Bengaluru</b> (<a href="static/Advertisement_sbd_fta_2025.pdf">Advertisement</a>) / (<a href="https://sbdapp.bhel.in/FTARecruitment/">Apply Online</a>)<br/>
        <img src="arrow3.gif"><b>Engagement of Paramedical &amp; Technician Staff on FTA basis - HEP, Bhopal</b> (<a href="https://bpl.bhel.com/bplweb_new/careers/index1.html">Apply online</a>)<br/>
      </div>
    </div>
    <div class="w3-row-padding w3-padding-64 w3-center" id="whybhel">
      <h2>Why BHEL?</h2>
    </div>
  </body>
</html>
`

const invalidHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Official Website of Bharat Heavy Electricals Limited, New Delhi, India |</title>
  </head>
  <body>
    <main>
      <h1>Official Website of Bharat Heavy Electricals Limited</h1>
      <p>No careers link here.</p>
    </main>
  </body>
</html>
`

const invalidCareersHtml = `
<!doctype html>
<html>
  <head>
    <title>BHEL Careers Portal</title>
  </head>
  <body>
    <main>
      <h1>BHEL Careers Portal</h1>
      <p>Welcome to our portal.</p>
    </main>
  </body>
</html>
`

const untrustedLinkCareersHtml = careersHtml.replace(
  'https://sbdapp.bhel.in/FTARecruitment/',
  'https://jobs.lever.co/bhel/sbd-fta',
)

const loadModule = async () => {
  try {
    return await import('../../scraper/bharatheavyelectricals/script.js')
  } catch {
    assert.fail('Expected Bharat Heavy Electricals scraper module at ../../scraper/bharatheavyelectricals/script.js')
  }
}

test('Bharat Heavy Electricals scraper constants stay pinned to the verified first-party careers portal from July 15, 2026', async () => {
  const bhel = await loadModule()

  assert.equal(bhel.SOURCE, 'bharatheavyelectricals')
  assert.equal(bhel.COMPANY, 'Bharat Heavy Electricals')
  assert.equal(bhel.OFFICIAL_BRAND_NAME, 'Bharat Heavy Electricals Limited')
  assert.equal(bhel.VERIFIED_AT, '2026-07-15')
  assert.equal(bhel.HOMEPAGE_URL, 'https://www.bhel.com/')
  assert.equal(bhel.HOMEPAGE_LINKED_CAREERS_URL, 'https://careers.bhel.in/index.jsp')
  assert.equal(bhel.CAREERS_URL, 'https://careers.bhel.in/index.jsp')
  assert.deepEqual(bhel.TRUSTED_OPENING_HOSTS, [
    'careers.bhel.in',
    'careers1.bhel.in',
    'sbdapp.bhel.in',
    'edn.bhel.com',
    'ednnet.bhel.in',
    'hpep.bhel.com',
    'bpl.bhel.com',
    'cdn.digialm.com',
    'www.digialm.com',
    'digialm.com',
    'secure-web.cisco.com',
  ])
  assert.equal(bhel.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(
    bhel.extractHomepageCareersUrl(homepageHtml),
    'https://careers.bhel.in/index.jsp',
  )
  assert.equal(bhel.hasOfficialCareersSignal(careersHtml), true)

  const jobs = bhel.extractJobsFromCareersPage(careersHtml, FIXED_SCRAPED_AT)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      department: job.department,
      location: job.location,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      jobId: job.jobId,
    })),
    [
      {
        title: 'Artisan Recruitment - 2025',
        department: 'Regular Recruitment',
        location: null,
        sourceUrl: 'https://cdn.digialm.com//EForms/configuredHtml/1258/94876/Index.html',
        applyUrl: 'https://cdn.digialm.com//EForms/configuredHtml/1258/94876/Index.html',
        jobId: 'artisan-recruitment-2025',
      },
      {
        title: 'Recruitment of Engineer Trainees & Supervisor Trainees - 2025',
        department: 'Regular Recruitment',
        location: null,
        sourceUrl: 'https://cdn.digialm.com//EForms/configuredHtml/1258/92788/Index.html',
        applyUrl: 'https://cdn.digialm.com//EForms/configuredHtml/1258/92788/Index.html',
        jobId: 'recruitment-of-engineer-trainees-and-supervisor-trainees-2025',
      },
      {
        title: 'Engagement of Senior Consultant for Kasturba Hospital at BHEL, Bhopal',
        department: 'Recruitment of Consultants/Experts/Deputation',
        location: 'Bhopal, India',
        sourceUrl: 'https://careers1.bhel.in/lateral2020/jsp/et_eng_index.jsp',
        applyUrl: 'https://careers1.bhel.in/lateral2020/jsp/et_eng_index.jsp',
        jobId: 'engagement-of-senior-consultant-for-kasturba-hospital-at-bhel-bhopal',
      },
      {
        title: 'Engagement of Engineers and Supervisors on Fixed Tenure Appointment (FTA) basis for SBD Bengaluru',
        department: 'Recruitment of FTA/ Part-Time positions',
        location: 'Bangalore, India',
        sourceUrl: 'https://sbdapp.bhel.in/FTARecruitment/',
        applyUrl: 'https://sbdapp.bhel.in/FTARecruitment/',
        jobId: 'engagement-of-engineers-and-supervisors-on-fixed-tenure-appointment-fta-basis-for-sbd-bengaluru',
      },
      {
        title: 'Engagement of Paramedical & Technician Staff on FTA basis - HEP, Bhopal',
        department: 'Recruitment of FTA/ Part-Time positions',
        location: 'Bhopal, India',
        sourceUrl: 'https://bpl.bhel.com/bplweb_new/careers/index1.html',
        applyUrl: 'https://bpl.bhel.com/bplweb_new/careers/index1.html',
        jobId: 'engagement-of-paramedical-and-technician-staff-on-fta-basis-hep-bhopal',
      },
    ],
  )
})

test('Bharat Heavy Electricals run validates the homepage handoff and extracts openings from the verified current-openings page', async () => {
  const bhel = await loadModule()
  const requestedUrls = []

  const jobs = await bhel.createBharatHeavyElectricalsScraper({
    maxJobs: 3,
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === bhel.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === bhel.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      throw new Error(`Unexpected Bharat Heavy Electricals URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    bhel.HOMEPAGE_URL,
    bhel.CAREERS_URL,
  ])
  assert.deepEqual(
    jobs.map((job) => [job.title, job.department, job.link, job.scrapedAt]),
    [
      [
        'Artisan Recruitment - 2025',
        'Regular Recruitment',
        'https://cdn.digialm.com//EForms/configuredHtml/1258/94876/Index.html',
        FIXED_SCRAPED_AT,
      ],
      [
        'Recruitment of Engineer Trainees & Supervisor Trainees - 2025',
        'Regular Recruitment',
        'https://cdn.digialm.com//EForms/configuredHtml/1258/92788/Index.html',
        FIXED_SCRAPED_AT,
      ],
      [
        'Engagement of Senior Consultant for Kasturba Hospital at BHEL, Bhopal',
        'Recruitment of Consultants/Experts/Deputation',
        'https://careers1.bhel.in/lateral2020/jsp/et_eng_index.jsp',
        FIXED_SCRAPED_AT,
      ],
    ],
  )
})

test('Bharat Heavy Electricals fails closed when the homepage handoff, careers shell, or trusted opening links drift', async () => {
  const bhel = await loadModule()

  await assert.rejects(
    bhel.createBharatHeavyElectricalsScraper().run({
      fetchPage: async (url) => {
        if (url === bhel.HOMEPAGE_URL) {
          return { status: 200, url, html: invalidHomepageHtml }
        }

        throw new Error(`Unexpected Bharat Heavy Electricals URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    bhel.createBharatHeavyElectricalsScraper().run({
      fetchPage: async (url) => {
        if (url === bhel.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === bhel.CAREERS_URL) {
          return { status: 200, url, html: invalidCareersHtml }
        }

        throw new Error(`Unexpected Bharat Heavy Electricals URL: ${url}`)
      },
    }),
    /verified public careers surface/i,
  )

  await assert.rejects(
    bhel.createBharatHeavyElectricalsScraper().run({
      fetchPage: async (url) => {
        if (url === bhel.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === bhel.CAREERS_URL) {
          return { status: 200, url, html: untrustedLinkCareersHtml }
        }

        throw new Error(`Unexpected Bharat Heavy Electricals URL: ${url}`)
      },
    }),
    /trusted public opening link/i,
  )
})
