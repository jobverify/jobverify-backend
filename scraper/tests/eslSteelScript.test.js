import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-15T00:00:00.000Z'

const homepageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>ESL Steel Plant in Bokaro, Jharkhand | Steel Manufacturing Company</title>
  </head>
  <body>
    <ul>
      <li><a href="https://www.eslsteel.com/career/">Career</a></li>
    </ul>
    <h2 class="hdng hdng-head">ABOUT ESL STEEL LIMITED<span>.</span></h2>
    <div class="about_introtxt">
      ESL Steel Limited is a greenfield, integrated steel plant in the Bokaro district of Jharkhand.
    </div>
  </body>
</html>
`

const jobsArchiveHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Jobs Archive - Esl</title>
    <link rel="canonical" href="https://www.eslsteel.com/jobs/" />
  </head>
  <body>
    <div class="sjb-archive-page">
      <div class="sjb-listing">
        <div class="list-view">
          <div class="list-data">
            <div class="v1 sjb-job-3917">
              <header>
                <div class="job-info">
                  <h4>
                    <a href="https://www.eslsteel.com/jobs/shift-in-charge-blast-furnace/">
                      <span class="job-title">Shift In-charge Blast Furnace</span>
                    </a>
                  </h4>
                </div>
                <div class="job-date"><i class="fa fa-calendar-check"></i>Posted 10 months ago</div>
              </header>
              <div class="sjb_more_content" id="sjb_more_content_3917">
                Experience: Min 10 Years
                Location: Bokaro
                Qualification: B.E/B. Tech in Metallurgy
              </div>
              <div class="job-description">
                <div id="sjb_less_content_3917">
                  <p>Experience: Min 10 Years Location: Bokaro Qualification: B.E/B. Tech in Metallurgy Role &amp; Responsibilities...</p>
                </div>
                <div class="btn-grp">
                  <a href="https://www.eslsteel.com/jobs/shift-in-charge-blast-furnace/">Read More</a>
                </div>
              </div>
            </div>
            <div class="v1 sjb-job-3922">
              <header>
                <div class="job-info">
                  <h4>
                    <a href="https://www.eslsteel.com/jobs/product-head-dip/">
                      <span class="job-title">Product Head &#8211; DIP</span>
                    </a>
                  </h4>
                </div>
                <div class="job-date"><i class="fa fa-calendar-check"></i>Posted 6 months ago</div>
              </header>
              <div class="sjb_more_content" id="sjb_more_content_3922">
                Experience: Min 12 Years in Sales &amp; Marketing
                Location: Kolkata, West Bengal
                Qualification: MBA with relevant Experience
              </div>
              <div class="job-description">
                <div id="sjb_less_content_3922">
                  <p>Experience: Min 12 Years in Sales &amp; Marketing Location: Kolkata, West Bengal Qualification: MBA with relevant Experience...</p>
                </div>
                <div class="btn-grp">
                  <a href="https://www.eslsteel.com/jobs/product-head-dip/">Read More</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`

const shiftInChargeDetailHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Shift In-charge Blast Furnace - Esl</title>
    <link rel="canonical" href="https://www.eslsteel.com/jobs/shift-in-charge-blast-furnace/" />
  </head>
  <body>
    <div class="job-detail">
      <h2><span class="job-title">Shift In-charge Blast Furnace</span></h2>
    </div>
    <p>Experience: Min 10 Years<br />Location: Bokaro</p>
    <p>Qualification: B.E/B. Tech in Metallurgy</p>
    <p>Role &amp; Responsibilities:<br />Ensure environment, health, and safety at workplace with zero harm, zero discharge and zero waste.</p>
    <h3>Apply For This Job</h3>
    <label for="jobapp_name">Name<span class="required">*</span></label>
    <label for="jobapp_years_of_exp">Years of Exp<span class="required">*</span></label>
    <label for="applicant-resume">Attach Resume<span class="required">*</span></label>
    <input type="hidden" name="job_id" value="3917" />
    <input type="hidden" name="action" value="process_applicant_form" />
  </body>
</html>
`

const productHeadDetailHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Product Head &#8211; DIP - Esl</title>
    <link rel="canonical" href="https://www.eslsteel.com/jobs/product-head-dip/" />
  </head>
  <body>
    <div class="job-detail">
      <h2><span class="job-title">Product Head &#8211; DIP</span></h2>
    </div>
    <p>Experience: Min 12 Years in Sales &amp; Marketing<br />Location: Kolkata, West Bengal</p>
    <p>Qualification: MBA with relevant Experience</p>
    <p>We are seeking a dynamic and seasoned Product Head for Sales &amp; Marketing of our Ductile Iron Pipe division.</p>
    <h3>Apply For This Job</h3>
    <label for="jobapp_name">Name<span class="required">*</span></label>
    <label for="jobapp_years_of_exp">Years of Exp<span class="required">*</span></label>
    <label for="applicant-resume">Attach Resume<span class="required">*</span></label>
    <input type="hidden" name="job_id" value="3922" />
    <input type="hidden" name="action" value="process_applicant_form" />
  </body>
</html>
`

const loadEslSteelModule = async () => {
  try {
    return await import('../eslsteel/script.js')
  } catch {
    assert.fail('Expected ESL Steel scraper module at ../eslsteel/script.js')
  }
}

test('ESL Steel helpers keep the verified homepage, jobs archive, and job detail surfaces pinned', async () => {
  const eslSteel = await loadEslSteelModule()

  assert.equal(eslSteel.SOURCE, 'eslsteel')
  assert.equal(eslSteel.COMPANY, 'ESL Steel')
  assert.equal(eslSteel.OFFICIAL_BRAND_NAME, 'ESL Steel Limited')
  assert.equal(eslSteel.VERIFIED_ON, '2026-07-15')
  assert.equal(eslSteel.HOMEPAGE_URL, 'https://www.eslsteel.com/')
  assert.equal(eslSteel.JOBS_ARCHIVE_URL, 'https://www.eslsteel.com/jobs/')
  assert.equal(
    eslSteel.buildJobDetailUrl('shift-in-charge-blast-furnace'),
    'https://www.eslsteel.com/jobs/shift-in-charge-blast-furnace/',
  )
  assert.equal(eslSteel.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(eslSteel.hasJobsArchiveSignal(jobsArchiveHtml), true)
  assert.equal(eslSteel.hasJobDetailSignal(shiftInChargeDetailHtml), true)
})

test('ESL Steel extracts first-party jobs archive cards and detail pages', async () => {
  const eslSteel = await loadEslSteelModule()

  const cards = eslSteel.extractJobCards(jobsArchiveHtml)
  assert.deepEqual(cards, [
    {
      slug: 'shift-in-charge-blast-furnace',
      title: 'Shift In-charge Blast Furnace',
      sourceUrl: 'https://www.eslsteel.com/jobs/shift-in-charge-blast-furnace/',
    },
    {
      slug: 'product-head-dip',
      title: 'Product Head - DIP',
      sourceUrl: 'https://www.eslsteel.com/jobs/product-head-dip/',
    },
  ])

  const detail = eslSteel.extractJobDetail(shiftInChargeDetailHtml, cards[0], FIXED_SCRAPED_AT)
  assert.deepEqual(detail, {
    jobId: '3917',
    requisitionId: 'shift-in-charge-blast-furnace',
    title: 'Shift In-charge Blast Furnace',
    company: 'ESL Steel',
    department: null,
    location: 'Bokaro, India',
    city: 'Bokaro',
    state: null,
    country: 'India',
    sourceUrl: 'https://www.eslsteel.com/jobs/shift-in-charge-blast-furnace/',
    applyUrl: 'https://www.eslsteel.com/jobs/shift-in-charge-blast-furnace/',
    employmentType: null,
    experienceRequired: 'Min 10 Years',
    minimumQualification: 'B.E/B. Tech in Metallurgy',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'Experience: Min 10 Years Location: Bokaro Qualification: B.E/B. Tech in Metallurgy Role & Responsibilities: Ensure environment, health, and safety at workplace with zero harm, zero discharge and zero waste.',
    source: 'eslsteel',
    link: 'https://www.eslsteel.com/jobs/shift-in-charge-blast-furnace/',
    scrapedAt: FIXED_SCRAPED_AT,
  })
})

test('run validates the verified ESL Steel jobs archive surface and returns first-party detail jobs', async () => {
  const eslSteel = await loadEslSteelModule()
  const requestedUrls = []

  const jobs = await eslSteel.createEslSteelScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === eslSteel.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === eslSteel.JOBS_ARCHIVE_URL) {
        return { status: 200, url, html: jobsArchiveHtml }
      }

      if (url === 'https://www.eslsteel.com/jobs/shift-in-charge-blast-furnace/') {
        return { status: 200, url, html: shiftInChargeDetailHtml }
      }

      if (url === 'https://www.eslsteel.com/jobs/product-head-dip/') {
        return { status: 200, url, html: productHeadDetailHtml }
      }

      throw new Error(`Unexpected ESL Steel URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.eslsteel.com/',
    'https://www.eslsteel.com/jobs/',
    'https://www.eslsteel.com/jobs/shift-in-charge-blast-furnace/',
    'https://www.eslsteel.com/jobs/product-head-dip/',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'eslsteel')
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
  assert.equal(jobs[1].title, 'Product Head - DIP')
  assert.equal(jobs[1].location, 'Kolkata, West Bengal, India')
})

test('run fails closed when the verified ESL Steel archive or detail surface drifts', async () => {
  const eslSteel = await loadEslSteelModule()

  await assert.rejects(
    eslSteel.createEslSteelScraper().run({
      fetchPage: async (url) => {
        if (url === eslSteel.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body>No official homepage markers</body></html>' }
        }

        throw new Error(`Unexpected ESL Steel URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    eslSteel.createEslSteelScraper().run({
      fetchPage: async (url) => {
        if (url === eslSteel.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === eslSteel.JOBS_ARCHIVE_URL) {
          return { status: 200, url, html: jobsArchiveHtml.replace('Jobs Archive - Esl', 'Careers Archive') }
        }

        throw new Error(`Unexpected ESL Steel URL: ${url}`)
      },
    }),
    /verified first-party jobs archive/i,
  )

  await assert.rejects(
    eslSteel.createEslSteelScraper().run({
      fetchPage: async (url) => {
        if (url === eslSteel.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === eslSteel.JOBS_ARCHIVE_URL) {
          return { status: 200, url, html: jobsArchiveHtml }
        }

        if (url === 'https://www.eslsteel.com/jobs/shift-in-charge-blast-furnace/') {
          return { status: 200, url, html: shiftInChargeDetailHtml.replace('Apply For This Job', 'Apply Later') }
        }

        if (url === 'https://www.eslsteel.com/jobs/product-head-dip/') {
          return { status: 200, url, html: productHeadDetailHtml }
        }

        throw new Error(`Unexpected ESL Steel URL: ${url}`)
      },
    }),
    /verified first-party job detail/i,
  )
})
