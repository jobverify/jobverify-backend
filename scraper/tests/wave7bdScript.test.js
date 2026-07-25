import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async (relativePath) => {
  try {
    return await import(relativePath)
  } catch {
    assert.fail(`Expected scraper module at ${relativePath}`)
  }
}

const CYBER_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs and Current Openings | Career at CIS</title>
  </head>
  <body>
    <main>
      <h1>Stop Dreaming Start Living</h1>
      <p>career@cisin.com</p>
      <section data-country="India">
        <h2>Current roles at India</h2>
        <article class="job-card">
          <h3>Generative AI Developer Freshers</h3>
          <p>Exp: 0 month - 1 years India</p>
          <a href="/india-job/generative-ai-developer-freshers-jobs">View Details</a>
          <a href="https://r.cisin.com/apply/generative-ai-developer-freshers">Apply Now</a>
        </article>
        <article class="job-card">
          <h3>Junior Network Engineer</h3>
          <p>Exp: 6 month - 6 years India</p>
          <a href="/india-job/junior-network-engineer-jobs">View Details</a>
          <a href="https://r.cisin.com/apply/junior-network-engineer">Apply Now</a>
        </article>
      </section>
      <section data-country="United States">
        <h2>Current roles at United States</h2>
        <article class="job-card">
          <h3>AI Engineer</h3>
          <a href="/usa-job/ai-engineer-jobs">View Details</a>
        </article>
      </section>
    </main>
  </body>
</html>
`

const CI_INFOTECH_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Current Tech Openings - CI Infotech Pvt. Ltd.</title>
  </head>
  <body>
    <main>
      <h1>Current Openings</h1>
      <p>Find Job</p>
      <article class="job-entry">
        <h2><a href="https://ciinfotech.net/jobs/agm-sales-it-service-amc/">AGM Sales - IT Service / AMC</a></h2>
        <p class="meta">
          <span class="posted">July 4, 2021</span>
          <span class="location">New Delhi</span>
          <span class="job-type">Sales</span>
        </p>
      </article>
      <article class="job-entry">
        <h2><a href="https://ciinfotech.net/jobs/dgm-sales-psu-government/">DGM Sales (PSU / Government)</a></h2>
        <p class="meta">
          <span class="posted">July 4, 2021</span>
          <span class="location">New Delhi</span>
          <span class="job-type">Sales</span>
        </p>
      </article>
    </main>
  </body>
</html>
`

const WEBTEL_SENTINEL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Webtel: Explore Opportunities & Join Our Dynamic Team</title>
  </head>
  <body>
    <main>
      <h1>Be a Part of The Webtel Family!</h1>
      <p>Leading Compliance Solutions Company for over 2 Decades</p>
      <section>
        <h2>We Welcome You to Webtel</h2>
        <p>We have our doors open for growth-driven creative heads.</p>
      </section>
      <section>
        <h2>Let's Share Equal Opportunities</h2>
        <p>We at Webtel believe in mutual growth.</p>
      </section>
    </main>
  </body>
</html>
`

const APPCINO_SENTINEL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Xebia</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <h2>Become a Xebian</h2>
      <p>Joining Xebia means stepping into a culture that values craftsmanship.</p>
      <h2>Open Positions</h2>
      <p>APAC</p>
      <p>North America (USA / Canada)</p>
    </main>
  </body>
</html>
`

const LOTUS_SENTINEL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>LWT Careers</title>
  </head>
  <body>
    <main>
      <h1>Why Join LWT</h1>
      <p>Engineering-Led Environment</p>
      <p>Apply at hr@lotuswireless.com</p>
      <p>Lotus Wireless Technologies India Pvt. Ltd.</p>
    </main>
  </body>
</html>
`

const PUBLIC_JOB_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Open Jobs</title>
  </head>
  <body>
    <main>
      <article itemscope itemtype="https://schema.org/JobPosting" data-job-id="public-001">
        <h2 itemprop="title">Senior Engineer</h2>
        <a href="/jobs/senior-engineer">Apply Now</a>
      </article>
    </main>
  </body>
</html>
`

test('Cyber Infrastructure parses India roles from the verified first-party jobs board', async () => {
  const cyber = await loadModule('../cyberinfrastructure/script.js')

  assert.equal(cyber.SOURCE, 'cyberinfrastructure')
  assert.equal(cyber.COMPANY, 'Cyber Infrastructure')
  assert.equal(cyber.CAREERS_URL, 'https://career.cisin.com/')
  assert.equal(cyber.VERIFIED_ON, '2026-07-18')
  assert.equal(cyber.hasOfficialJobsBoardSignal(CYBER_HTML), true)

  const jobs = await cyber.createCyberInfrastructureScraper().run({
    fetchText: async () => CYBER_HTML,
  })

  assert.deepEqual(jobs, [
    {
      title: 'Generative AI Developer Freshers',
      location: 'India',
      detailUrl: 'https://career.cisin.com/india-job/generative-ai-developer-freshers-jobs',
      applyUrl: 'https://r.cisin.com/apply/generative-ai-developer-freshers',
    },
    {
      title: 'Junior Network Engineer',
      location: 'India',
      detailUrl: 'https://career.cisin.com/india-job/junior-network-engineer-jobs',
      applyUrl: 'https://r.cisin.com/apply/junior-network-engineer',
    },
  ])
})

test('Cyber Infrastructure fails closed when the verified board contract disappears', async () => {
  const cyber = await loadModule('../cyberinfrastructure/script.js')

  await assert.rejects(
    cyber.createCyberInfrastructureScraper().run({
      fetchText: async () => WEBTEL_SENTINEL_HTML,
    }),
    /verified Cyber Infrastructure jobs board/i,
  )
})

test('Webtel Electrosoft stays fail-closed while the first-party careers page remains marketing-only', async () => {
  const webtel = await loadModule('../webtelelectrosoft/script.js')

  assert.equal(webtel.SOURCE, 'webtelelectrosoft')
  assert.equal(webtel.COMPANY, 'Webtel Electrosoft')
  assert.equal(webtel.CAREERS_URL, 'https://webtel.in/careers')
  assert.equal(webtel.VERIFIED_ON, '2026-07-18')
  assert.equal(webtel.hasOfficialCareersSignal(WEBTEL_SENTINEL_HTML), true)
  assert.equal(webtel.hasPublicJobSignals(WEBTEL_SENTINEL_HTML), false)
  assert.equal(webtel.hasPublicJobSignals(PUBLIC_JOB_HTML), true)

  const jobs = await webtel.createWebtelElectrosoftScraper().run({
    fetchText: async () => WEBTEL_SENTINEL_HTML,
  })

  assert.deepEqual(jobs, [])

  await assert.rejects(
    webtel.createWebtelElectrosoftScraper().run({
      fetchText: async () => PUBLIC_JOB_HTML,
    }),
    /verified Webtel careers page/i,
  )
})

test('CI Infotech parses opening cards from the first-party current-openings page', async () => {
  const ciInfotech = await loadModule('../ciinfotech/script.js')

  assert.equal(ciInfotech.SOURCE, 'ciinfotech')
  assert.equal(ciInfotech.COMPANY, 'CI Infotech')
  assert.equal(ciInfotech.CAREERS_URL, 'https://ciinfotech.net/current-openings/')
  assert.equal(ciInfotech.VERIFIED_ON, '2026-07-18')
  assert.equal(ciInfotech.hasOfficialOpeningsSignal(CI_INFOTECH_HTML), true)

  const jobs = await ciInfotech.createCiInfotechScraper().run({
    fetchText: async () => CI_INFOTECH_HTML,
  })

  assert.deepEqual(jobs, [
    {
      title: 'AGM Sales - IT Service / AMC',
      location: 'New Delhi',
      postedAt: 'July 4, 2021',
      jobType: 'Sales',
      detailUrl: 'https://ciinfotech.net/jobs/agm-sales-it-service-amc/',
    },
    {
      title: 'DGM Sales (PSU / Government)',
      location: 'New Delhi',
      postedAt: 'July 4, 2021',
      jobType: 'Sales',
      detailUrl: 'https://ciinfotech.net/jobs/dgm-sales-psu-government/',
    },
  ])
})

test('CI Infotech fails closed if the first-party openings page no longer matches the verified structure', async () => {
  const ciInfotech = await loadModule('../ciinfotech/script.js')

  await assert.rejects(
    ciInfotech.createCiInfotechScraper().run({
      fetchText: async () => PUBLIC_JOB_HTML,
    }),
    /verified CI Infotech openings page/i,
  )
})

test('Appcino Technologies stays fail-closed while recruiting remains on the generic Xebia careers hub', async () => {
  const appcino = await loadModule('../appcinotechnologies/script.js')

  assert.equal(appcino.SOURCE, 'appcinotechnologies')
  assert.equal(appcino.COMPANY, 'Appcino Technologies')
  assert.equal(appcino.CAREERS_URL, 'https://xebia.com/careers/')
  assert.equal(appcino.VERIFIED_ON, '2026-07-18')
  assert.equal(appcino.hasParentCareersHubSignal(APPCINO_SENTINEL_HTML), true)
  assert.equal(appcino.hasAppcinoSpecificInventory(APPCINO_SENTINEL_HTML), false)

  const jobs = await appcino.createAppcinoTechnologiesScraper().run({
    fetchText: async () => APPCINO_SENTINEL_HTML,
  })

  assert.deepEqual(jobs, [])

  await assert.rejects(
    appcino.createAppcinoTechnologiesScraper().run({
      fetchText: async () => `${APPCINO_SENTINEL_HTML}\n<section>Appcino Jobs</section>`,
    }),
    /verified Appcino recruiting surface/i,
  )
})

test('Lotus Wireless Technologies stays fail-closed while the first-party page remains apply-via-email only', async () => {
  const lotus = await loadModule('../lotuswirelesstechnologies/script.js')

  assert.equal(lotus.SOURCE, 'lotuswirelesstechnologies')
  assert.equal(lotus.COMPANY, 'Lotus Wireless Technologies')
  assert.equal(lotus.CAREERS_URL, 'https://www.lotuswireless.com/careers.html')
  assert.equal(lotus.VERIFIED_ON, '2026-07-18')
  assert.equal(lotus.hasOfficialCareersSignal(LOTUS_SENTINEL_HTML), true)
  assert.equal(lotus.hasPublicJobSignals(LOTUS_SENTINEL_HTML), false)
  assert.equal(lotus.hasPublicJobSignals(PUBLIC_JOB_HTML), true)

  const jobs = await lotus.createLotusWirelessTechnologiesScraper().run({
    fetchText: async () => LOTUS_SENTINEL_HTML,
  })

  assert.deepEqual(jobs, [])

  await assert.rejects(
    lotus.createLotusWirelessTechnologiesScraper().run({
      fetchText: async () => PUBLIC_JOB_HTML,
    }),
    /verified Lotus Wireless careers page/i,
  )
})
