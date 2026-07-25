import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T00:00:00.000Z'

const loadModule = async (relativePath) => {
  try {
    return await import(relativePath)
  } catch {
    assert.fail(`Expected scraper module at ${relativePath}`)
  }
}

const nuventoCareersHubHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h2>Careers</h2>
    <h6>Careers in India</h6>
    <a href="https://nuvento.com/careers/kochi/">Careers In INDIA</a>
  </body>
</html>
`

const nuventoIndiaCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h2>Nuvento - India</h2>
    <p>For all the enquiries and resume submission please email to naseeba.parvin@nuvento.com</p>
    <p>anindita.ghosal@nuvento.com</p>

    <h4>US Finance &amp; Accounts /<br>Senior Executive</h4>
    <h6>Location: Kochi, Kerala</h6>
    <h6>Key Responsibilities</h6>
    <ul>
      <li>Invoicing &amp; Revenue</li>
      <li>Accounts Receivable</li>
    </ul>
    <h6>Qualifications</h6>
    <ul>
      <li>Bachelor's in Commerce/Finance/Accounting</li>
      <li>2-5 years of experience in finance &amp; accounting</li>
    </ul>

    <h4>IT/Sr/JR Recruiter</h4>
    <h6>Location: Bangalore (Onsite)</h6>
    <p>Role Overview</p>
    <p>We are looking for a high-performing IT Recruiter with strong experience in niche technology hiring.</p>
    <h6>Key Responsibilities</h6>
    <ul>
      <li>Handle end-to-end recruitment lifecycle for Contract-to-Hire positions.</li>
      <li>Build strong talent pipelines.</li>
    </ul>
    <h6>Qualifications</h6>
    <ul>
      <li>2-10 years of IT recruitment experience.</li>
      <li>Strong understanding of technology stacks.</li>
    </ul>

    <h4>Team Lead -Python</h4>
    <h6>Experience: 10+ Years</h6>
    <p>Location: Kerala (Hybrid)</p>
    <h6>Key Responsibilities</h6>
    <ul>
      <li>Lead architecture and development of Django-based services.</li>
      <li>Build evaluation and monitoring for GenAI.</li>
    </ul>

    <h4>Sales and Marketing Intern (Paid Internship)</h4>
    <h6>Location: PAN India</h6>
    <p>Work Mode: Remote</p>
    <h6>Key Responsibilities</h6>
    <ul>
      <li>Assist in planning and executing digital marketing and sales campaigns.</li>
      <li>Support lead generation.</li>
    </ul>
    <h6>Required Skills</h6>
    <ul>
      <li>Excellent communication and presentation abilities.</li>
      <li>Strong interpersonal and customer engagement skills.</li>
    </ul>

    <h6>Address</h6>
    <p>Kochi</p>
  </body>
</html>
`

const qualeHomepageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <nav>
      <a href="/">Home</a>
      <a href="/about-us/">About Us</a>
      <a href="/contact-us/">Contact Us</a>
    </nav>
    <h1>Generative AI</h1>
    <p>Unlock Infinite Potential</p>
    <p>430-432 Tower A, Spaze I-Tech Park, Sector 49, Sohna Road, Gurugram 122018, Haryana.</p>
    <p>info@qualeinfotech.com</p>
  </body>
</html>
`

const qualeAboutHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h2>About Us</h2>
    <h3>Who We Are</h3>
    <p>Quale Infotech is a leading innovator at the forefront of digital transformation.</p>
    <p>Transparency</p>
    <p>Trust</p>
    <p>Innovation</p>
  </body>
</html>
`

const qualeContactHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h2>Contact Us</h2>
    <p>How can we help?</p>
    <p>Ready to unlock the potential of next-generation technology and transform your operations?</p>
    <p>India - Gurugram</p>
    <p>India - Delhi</p>
    <p>India - Bengaluru</p>
  </body>
</html>
`

const capitalNumbersCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Stable, Rewarding Remote Work Opportunities from Capital Numbers</h1>
    <h2>Build Your Career with Capital Numbers</h2>
    <p>Great opportunities begin with great people.</p>
    <p>Please email your current resume and a cover letter to career@capitalnumbers.com.</p>
    <p>If your profile matches our current or upcoming requirements, our recruitment team will get in touch.</p>
    <h2>Perks &amp; Benefits</h2>
  </body>
</html>
`

const inTimeTecCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Join us in creating</h1>
    <p>It takes a special kind of person to stand with us on our platform of abundance.</p>
    <a href="https://ats.rippling.com/intimetec">USA Careers</a>
    <a href="https://careers.intimetec.in/intimetec/jobslist">India Careers</a>
    <p>Careers at In Time Tec offer personal and professional development as well as traditional benefits.</p>
  </body>
</html>
`

const miracleCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h3>Contact Notice</h3>
    <p>If you have applied for a job please be aware that Miracle recruiters, HR or leadership will only contact you via email, phone or LinkedIn.</p>

    <section class="job-card">
      <div>Open Positions</div>
      <h1>NAVISION 2009 Consultant</h1>
      <h4>July 16th, 2026 Miracle Heights, India</h4>
      <a href="https://careers.miraclesoft.com/open-positions/open-positions-sub?jobId=MSSJ3036">Apply Now</a>
    </section>

    <section class="job-card">
      <div>Open Positions</div>
      <h1>Unily/SharePoint Developer</h1>
      <h4>July 16th, 2026 Miracle Heights, India</h4>
      <a href="https://careers.miraclesoft.com/open-positions/open-positions-sub?jobId=MSSJ3035">Apply Now</a>
    </section>

    <section class="job-card">
      <div>Open Positions</div>
      <h1>SAP Data Archiving Consultant</h1>
      <h4>July 10th, 2026 Miracle Heights, India</h4>
      <a href="https://careers.miraclesoft.com/open-positions/open-positions-sub?jobId=MSSJ3034">Apply Now</a>
    </section>

    <section class="job-card">
      <div>Open Positions</div>
      <h1>Android Developer</h1>
      <h4>July 10th, 2026 Miracle Heights, India</h4>
      <a href="https://careers.miraclesoft.com/open-positions/open-positions-sub?jobId=MSSJ3033">Apply Now</a>
    </section>
  </body>
</html>
`

test('Nuvento Systems run returns normalized jobs from the verified India careers page', async () => {
  const nuvento = await loadModule('../nuventosystems/script.js')
  const requestedUrls = []

  assert.equal(nuvento.hasOfficialCareersHubSignal(nuventoCareersHubHtml), true)
  assert.equal(nuvento.hasOfficialIndiaCareersSignal(nuventoIndiaCareersHtml), true)
  assert.equal(nuvento.extractRoleSections(nuventoIndiaCareersHtml).length, 4)

  const jobs = await nuvento.createNuventoSystemsScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === nuvento.CAREERS_HUB_URL) return nuventoCareersHubHtml
      if (url === nuvento.CAREERS_URL) return nuventoIndiaCareersHtml
      throw new Error(`Unexpected Nuvento URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [nuvento.CAREERS_HUB_URL, nuvento.CAREERS_URL])
  assert.equal(jobs.length, 4)
  assert.deepEqual(jobs.map((job) => job.title), [
    'IT/Sr/JR Recruiter',
    'Sales and Marketing Intern (Paid Internship)',
    'Team Lead -Python',
    'US Finance & Accounts / Senior Executive',
  ])
  assert.equal(jobs[0].location, 'Bangalore (Onsite)')
  assert.equal(jobs[1].workplaceType, 'Remote')
  assert.equal(jobs[2].experienceRequired, '10+ Years')
  assert.equal(jobs[3].city, 'Kochi')
})

test('Quale Infotech sentinel validates the verified homepage, about, and contact pages before returning []', async () => {
  const quale = await loadModule('../qualeinfotech/script.js')
  const requestedUrls = []

  assert.equal(quale.hasOfficialHomepageSignal(qualeHomepageHtml), true)
  assert.equal(quale.hasOfficialAboutSignal(qualeAboutHtml), true)
  assert.equal(quale.hasOfficialContactSignal(qualeContactHtml), true)
  assert.equal(quale.hasPublicCareersSignal(qualeHomepageHtml), false)

  const jobs = await quale.createQualeInfotechScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === quale.HOMEPAGE_URL) return qualeHomepageHtml
      if (url === quale.ABOUT_URL) return qualeAboutHtml
      if (url === quale.CONTACT_URL) return qualeContactHtml
      throw new Error(`Unexpected Quale URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [quale.HOMEPAGE_URL, quale.ABOUT_URL, quale.CONTACT_URL])
  assert.deepEqual(jobs, [])
})

test('Capital Numbers Infotech sentinel validates the email-resume-only careers page and returns []', async () => {
  const capitalNumbers = await loadModule('../capitalnumbersinfotech/script.js')

  assert.equal(capitalNumbers.hasOfficialCareersSignal(capitalNumbersCareersHtml), true)
  assert.equal(capitalNumbers.hasPublicJobListingSignal(capitalNumbersCareersHtml), false)

  const jobs = await capitalNumbers.createCapitalNumbersInfotechScraper().run({
    fetchText: async (url) => {
      assert.equal(url, capitalNumbers.CAREERS_URL)
      return capitalNumbersCareersHtml
    },
  })

  assert.deepEqual(jobs, [])
})

test('In Time Tec Visionsoft sentinel validates the first-party careers page and returns [] while the India board is blocked', async () => {
  const inTimeTec = await loadModule('../intimetecvisionsoft/script.js')

  assert.equal(inTimeTec.hasOfficialCareersSignal(inTimeTecCareersHtml), true)
  assert.equal(
    inTimeTec.isBlockedBoardPage({
      status: 403,
      url: inTimeTec.INDIA_JOBS_URL,
      html: '<html><body><h1>403 Forbidden</h1><p>Request forbidden by administrative rules.</p></body></html>',
    }),
    true,
  )

  const jobs = await inTimeTec.createInTimeTecVisionsoftScraper().run({
    fetchPage: async (url) => {
      if (url === inTimeTec.CAREERS_URL) {
        return { status: 200, url, html: inTimeTecCareersHtml }
      }
      if (url === inTimeTec.INDIA_JOBS_URL) {
        return {
          status: 403,
          url,
          html: '<html><body><h1>403 Forbidden</h1><p>Request forbidden by administrative rules.</p></body></html>',
        }
      }
      throw new Error(`Unexpected In Time Tec URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
})

test('Miracle Software Systems run returns normalized open positions from the first-party careers page', async () => {
  const miracle = await loadModule('../miraclesoftwaresystems/script.js')

  assert.equal(miracle.hasOfficialCareersSignal(miracleCareersHtml), true)
  assert.equal(miracle.extractVisibleJobCards(miracleCareersHtml).length, 4)

  const jobs = await miracle.createMiracleSoftwareSystemsScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      assert.equal(url, miracle.CAREERS_URL)
      return miracleCareersHtml
    },
  })

  assert.equal(jobs.length, 4)
  assert.deepEqual(jobs.map((job) => job.title), [
    'Android Developer',
    'NAVISION 2009 Consultant',
    'SAP Data Archiving Consultant',
    'Unily/SharePoint Developer',
  ])
  assert.equal(
    jobs[0].applyUrl,
    'https://careers.miraclesoft.com/open-positions/open-positions-sub?jobId=MSSJ3033',
  )
  assert.equal(jobs[1].postingDate, '2026-07-16')
  assert.equal(jobs[3].location, 'Miracle Heights, India')
})
