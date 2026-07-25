import assert from 'node:assert/strict'
import test from 'node:test'

const loadTexmoIndustriesModule = async () => {
  try {
    return await import('../texmoindustries/script.js')
  } catch {
    assert.fail('Expected Texmo Industries scraper module at ../texmoindustries/script.js')
  }
}

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <form name="jobForm" id="jobForm" action="#JobCard" method="post">
      <section class="bkg--cream">
        <div class="careers">
          <h2>Latest Careers</h2>
          <div class="careers__filter">
            <div class="careers__filter-item">
              <select name="company" id="company" onChange="this.form.submit()">
                <option value="" disabled selected hidden>COMPANY</option>
                <option value="">All Company</option>
                <option value="1490">Ramana Gounder Hospital</option>
                <option value="1806">Texmo Academy</option>
                <option value="1805">Texmo Blank</option>
                <option value="1489">Texmo Industries</option>
              </select>
            </div>
            <div class="careers__filter-item">
              <select name="location" id="location">
                <option value="" disabled selected hidden>LOCATION</option>
              </select>
            </div>
            <div class="careers__filter-item">
              <select name="role" id="role">
                <option value="" disabled selected hidden>JOB ROLE</option>
              </select>
            </div>
          </div>
        </div>
      </section>
    </form>
  </body>
</html>
`

const filteredPage1Html = `
<!doctype html>
<html lang="en">
  <body>
    <form name="jobForm" id="jobForm" action="#JobCard" method="post">
      <section class="bkg--cream">
        <div class="careers-list">
          <a href="/career-details?id=541133&#038;title=+Assistant++Engineer+-++Design+%28Electrical%29" class="careers-item">
            <div class="careers-item__header">
              <div>
                <p><strong> Assistant  Engineer &#8211;  Design (Electrical)</strong></p>
                <p>Coimbatore</p>
              </div>
            </div>
            <div class="careers-item__footer">
              <div>
                <p class="label">India</p>
                <p class="label">Product Engineering</p>
              </div>
            </div>
          </a>
        </div>
        <div class="pagination">
          <div><a href="#" class="active" onClick="PageClick('1');">1</a></div>
          <div><a href="#" class="" onClick="PageClick('2');">2</a></div>
        </div>
        <input type="hidden" name="pageNumber" id="pageNumber" />
      </section>
    </form>
  </body>
</html>
`

const filteredPage2Html = `
<!doctype html>
<html lang="en">
  <body>
    <form name="jobForm" id="jobForm" action="#JobCard" method="post">
      <section class="bkg--cream">
        <div class="careers-list">
          <a href="/career-details?id=522704&#038;title=Senior+Engineer+%E2%80%93+5S+%26+Visual+Management+Champion" class="careers-item">
            <div class="careers-item__header">
              <div>
                <p><strong>Senior Engineer – 5S &#038; Visual Management Champion</strong></p>
                <p>Coimbatore</p>
              </div>
            </div>
            <div class="careers-item__footer">
              <div>
                <p class="label">India</p>
                <p class="label">Manufacturing Operations</p>
              </div>
            </div>
          </a>
        </div>
        <div class="pagination">
          <div><a href="#" class="" onClick="PageClick('1');">1</a></div>
          <div><a href="#" class="active" onClick="PageClick('2');">2</a></div>
        </div>
        <input type="hidden" name="pageNumber" id="pageNumber" />
      </section>
    </form>
  </body>
</html>
`

const assistantEngineerDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <section class="banner">
      <div class="banner--content fade fade--delay__1">
        <h1> Assistant  Engineer -  Design (Electrical)</h1>
      </div>
    </section>
    <div class="career-details">
      <div class="career-details-inner">
        <a href="/job-application/?id=541133" class="btn btn--primary">Apply now</a>
        <div>
          <p><strong> Assistant  Engineer -  Design (Electrical) • Texmo Industries</strong><br />
            Coimbatore, India • Product Engineering
          </p>
        </div>
      </div>
    </div>
    <article>
      <div class="bkg--cream">
        <section class="career-details--list">
          <ul class="accordion-list">
            <li>
              <button class="accordion--title active" aria-expanded="true">Job Description</button>
              <div class="accordion--content">
                <div class="career-details-item--content">
                  <p><div>Design systems and products by reasoning from first principles and applying fundamental concepts of electromagnetics.</div></p>
                </div>
              </div>
            </li>
            <li>
              <button class="accordion--title" aria-expanded="false">Responsibilities</button>
              <div class="accordion--content">
                <div class="career-details-item--content">
                  <p><ul><li>Design and Development of Motors, especially AC induction motors.</li></ul></p>
                </div>
              </div>
            </li>
            <li>
              <button class="accordion--title" aria-expanded="false">Requirements</button>
              <div class="accordion--content">
                <div class="career-details-item--content">
                  <p><ul><li>B.E. in Electrical Engineering with experience in Motor design and development.</li></ul></p>
                </div>
              </div>
            </li>
          </ul>
        </section>
      </div>
      <div class="bkg--white career-details--additional">
        <h2>More Information</h2>
      </div>
    </article>
  </body>
</html>
`

const championDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <section class="banner">
      <div class="banner--content fade fade--delay__1">
        <h1>Senior Engineer – 5S & Visual Management Champion</h1>
      </div>
    </section>
    <div class="career-details">
      <div class="career-details-inner">
        <a href="/job-application/?id=522704" class="btn btn--primary">Apply now</a>
        <div>
          <p><strong>Senior Engineer – 5S & Visual Management Champion • Texmo Industries</strong><br />
            Coimbatore, India • Manufacturing Operations • Apply by 31/08/2026
          </p>
        </div>
      </div>
    </div>
    <article>
      <div class="bkg--cream">
        <section class="career-details--list">
          <ul class="accordion-list">
            <li>
              <button class="accordion--title active" aria-expanded="true">Job Description</button>
              <div class="accordion--content">
                <div class="career-details-item--content">
                  <p><div>The 5S &amp; VM Champion will be responsible for designing the 5S Strategy.</div></p>
                </div>
              </div>
            </li>
            <li>
              <button class="accordion--title" aria-expanded="false">Requirements</button>
              <div class="accordion--content">
                <div class="career-details-item--content">
                  <p><ul><li>Minimum of 3-5 years of experience in 5S and VM design and implementation.</li></ul></p>
                </div>
              </div>
            </li>
          </ul>
        </section>
      </div>
      <div class="bkg--white career-details--additional">
        <h2>More Information</h2>
      </div>
    </article>
  </body>
</html>
`

test('Texmo Industries helpers stay aligned with the verified official careers form, filter, and detail surfaces', async () => {
  const texmo = await loadTexmoIndustriesModule()

  assert.equal(texmo.CAREERS_URL, 'https://www.texmo.com/careers/')
  assert.equal(texmo.COMPANY_NAME, 'Texmo Industries')
  assert.equal(texmo.COMPANY_FILTER_VALUE, '1489')
  assert.equal(texmo.hasOfficialCareersPageSignal(officialCareersHtml), true)
  assert.equal(texmo.extractOfficialCompanyFilterValue(officialCareersHtml), '1489')
  assert.equal(texmo.buildCompanyPageRequestBody({ page: 1 }), 'company=1489')
  assert.equal(texmo.buildCompanyPageRequestBody({ page: 2 }), 'company=1489&pageNumber=2')
  assert.deepEqual(texmo.extractPaginationSummary(filteredPage1Html), {
    currentPage: 1,
    totalPages: 2,
    hasNext: true,
  })
  assert.deepEqual(texmo.extractSearchResults(filteredPage1Html), [
    {
      jobId: '541133',
      title: 'Assistant Engineer – Design (Electrical)',
      location: 'Coimbatore',
      country: 'India',
      department: 'Product Engineering',
      sourceUrl: 'https://www.texmo.com/career-details/?id=541133&title=+Assistant++Engineer+-++Design+%28Electrical%29',
    },
  ])
  assert.deepEqual(texmo.extractDetailSummary(championDetailHtml), {
    title: 'Senior Engineer – 5S & Visual Management Champion',
    company: 'Texmo Industries',
    location: 'Coimbatore, India',
    department: 'Manufacturing Operations',
    closingDate: '2026-08-31',
    applyUrl: 'https://www.texmo.com/job-application/?id=522704',
  })
  assert.match(
    texmo.extractDetailDescription(championDetailHtml),
    /Job Description: The 5S & VM Champion will be responsible/i,
  )
})

test('Texmo Industries scraper paginates the official company-filtered careers pages and maps detail pages into runnable jobs', async () => {
  const texmo = await loadTexmoIndustriesModule()
  const requests = []

  const jobs = await texmo.createTexmoIndustriesScraper().run({
    fetchText: async (url, options = {}) => {
      requests.push({
        url,
        method: options.method || 'GET',
        body: options.body || null,
      })

      if (url === texmo.CAREERS_URL && !options.method) return officialCareersHtml
      if (url === texmo.CAREERS_URL && options.body === 'company=1489') return filteredPage1Html
      if (url === texmo.CAREERS_URL && options.body === 'company=1489&pageNumber=2') {
        return filteredPage2Html
      }
      if (url === 'https://www.texmo.com/career-details/?id=541133&title=+Assistant++Engineer+-++Design+%28Electrical%29') {
        return assistantEngineerDetailHtml
      }
      if (url === 'https://www.texmo.com/career-details/?id=522704&title=Senior+Engineer+%E2%80%93+5S+%26+Visual+Management+Champion') {
        return championDetailHtml
      }

      throw new Error(`Unexpected Texmo Industries URL: ${url}`)
    },
  })

  assert.deepEqual(requests, [
    { url: texmo.CAREERS_URL, method: 'GET', body: null },
    { url: texmo.CAREERS_URL, method: 'POST', body: 'company=1489' },
    {
      url: 'https://www.texmo.com/career-details/?id=541133&title=+Assistant++Engineer+-++Design+%28Electrical%29',
      method: 'GET',
      body: null,
    },
    { url: texmo.CAREERS_URL, method: 'POST', body: 'company=1489&pageNumber=2' },
    {
      url: 'https://www.texmo.com/career-details/?id=522704&title=Senior+Engineer+%E2%80%93+5S+%26+Visual+Management+Champion',
      method: 'GET',
      body: null,
    },
  ])

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Assistant Engineer - Design (Electrical)',
    company: 'Texmo Industries',
    department: 'Product Engineering',
    location: 'Coimbatore, India',
    city: 'Coimbatore',
    country: 'India',
    jobId: '541133',
    requisitionId: '541133',
    sourceUrl: 'https://www.texmo.com/career-details/?id=541133&title=+Assistant++Engineer+-++Design+%28Electrical%29',
    applyUrl: 'https://www.texmo.com/job-application/?id=541133',
    link: 'https://www.texmo.com/job-application/?id=541133',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Job Description: Design systems and products by reasoning from first principles and applying fundamental concepts of electromagnetics. Responsibilities: Design and Development of Motors, especially AC induction motors. Requirements: B.E. in Electrical Engineering with experience in Motor design and development.',
    source: 'texmoindustries',
    scrapedAt: jobs[0].scrapedAt,
  })
  assert.equal(typeof jobs[0].scrapedAt, 'string')
  assert.equal(jobs[1].jobId, '522704')
  assert.equal(jobs[1].closingDate, '2026-08-31')
  assert.equal(jobs[1].experienceRequired, '3-5 years')
  assert.match(jobs[1].jobDescription, /Job Description: The 5S & VM Champion/i)
})

test('Texmo Industries scraper fails closed when the official company filter disappears or detail pages stop belonging to Texmo Industries', async () => {
  const texmo = await loadTexmoIndustriesModule()

  await assert.rejects(
    texmo.createTexmoIndustriesScraper().run({
      fetchText: async (url, options = {}) => {
        if (url === texmo.CAREERS_URL && !options.method) {
          return officialCareersHtml.replace('Texmo Industries', 'Texmo Legacy')
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified texmo industries company filter/i,
  )

  await assert.rejects(
    texmo.createTexmoIndustriesScraper().run({
      fetchText: async (url, options = {}) => {
        if (url === texmo.CAREERS_URL && !options.method) return officialCareersHtml
        if (url === texmo.CAREERS_URL && options.body === 'company=1489') return filteredPage1Html
        if (url === 'https://www.texmo.com/career-details/?id=541133&title=+Assistant++Engineer+-++Design+%28Electrical%29') {
          return assistantEngineerDetailHtml.replace('Texmo Industries', 'Texmo Blank')
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /detail page no longer resolves to texmo industries/i,
  )
})
