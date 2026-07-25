import assert from 'node:assert/strict'
import test from 'node:test'

const loadSanmarEngineeringModule = async () => {
  try {
    return await import('../sanmarengineering/script.js')
  } catch {
    assert.fail('Expected Sanmar Engineering scraper module at ../sanmarengineering/script.js')
  }
}

const careersPageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Where Integrity meets Excellence - The Sanmar Group</title>
  </head>
  <body>
    <form id="job-filter">
      <select name="business_area">
        <option value="">Business Area</option>
        <option value="Chemplast Sanmar Limited">Chemplast Sanmar Limited</option>
        <option value="Sanmar Matrix Metals limited">Sanmar Matrix Metals limited</option>
        <option value="Flowserve Sanmar Private Limited">Flowserve Sanmar Private Limited</option>
        <option value="Anderson Greenwood Crosby Sanmar Limited / Xomox Sanmar Limited">
          Anderson Greenwood Crosby Sanmar Limited / Xomox Sanmar Limited
        </option>
      </select>
    </form>
    <div class="post_content"></div>
    <script>
      function loadPosts(job_title, business_area, location, page) {
        $.ajax({
          url: 'https://www.sanmargroup.com/wp-admin/admin-ajax.php',
          method: 'POST',
          data: {
            action: 'filter_career_posts',
            post_type: 'job-opening',
            posts_per_page: 10,
            order: 'DESC',
            post_status: 'publish',
            template_file: 'template-parts/dropdown-filter-layouts/career-post-layout',
            not_found_message: 'No job openings found',
            paged: page,
            job_title: job_title,
            business_area: business_area,
            location: location
          }
        });
      }
    </script>
  </body>
</html>
`

const flowservePageOnePayload = {
  success: true,
  data: {
    html: `
      <div class="content_row">
        <div class="container">
          <div class="col col-title">Customer Service</div>
          <div class="col col-business">Flowserve Sanmar Private Limited</div>
          <div class="col col-location">Delhi, Mumbai, Pune, Baroda , Kolkata &amp; Chennai</div>
          <div class="col col-exp">5 - 8 years</div>
          <div class="col col-apply">
            <a href="https://www.sanmargroup.com/working-at-sanmar/opportunities/customer-service/" class="apply-now">Explore</a>
          </div>
        </div>
      </div>
      <div class="content_row">
        <div class="container">
          <div class="col col-title">Application Engineer</div>
          <div class="col col-business">Flowserve Sanmar Private Limited</div>
          <div class="col col-location">Karapakkam, Chennai</div>
          <div class="col col-exp">5 - 8 years</div>
          <div class="col col-apply">
            <a href="https://www.sanmargroup.com/working-at-sanmar/opportunities/application-engineer-flowserve/" class="apply-now">Explore</a>
          </div>
        </div>
      </div>
    `,
    post_count: 11,
  },
}

const flowservePageTwoPayload = {
  success: true,
  data: {
    html: `
      <div class="content_row">
        <div class="container">
          <div class="col col-title">Product Engineer</div>
          <div class="col col-business">Flowserve Sanmar Private Limited</div>
          <div class="col col-location">Karapakkam, Chennai</div>
          <div class="col col-exp">5 - 8 years</div>
          <div class="col col-apply">
            <a href="https://www.sanmargroup.com/working-at-sanmar/opportunities/product-engineer-flowserve/" class="apply-now">Explore</a>
          </div>
        </div>
      </div>
    `,
    post_count: 11,
  },
}

const agcslPageOnePayload = {
  success: true,
  data: {
    html: `
      <div class="content_row">
        <div class="container">
          <div class="col col-title">Sales Engineer</div>
          <div class="col col-business">Anderson Greenwood Crosby Sanmar Limited / Xomox Sanmar Limited</div>
          <div class="col col-location">Delhi, Mumbai, Pune, Baroda , Kolkata &amp; Chennai</div>
          <div class="col col-exp">5 - 8 years</div>
          <div class="col col-apply">
            <a href="https://www.sanmargroup.com/working-at-sanmar/opportunities/sales-engineer/" class="apply-now">Explore</a>
          </div>
        </div>
      </div>
      <div class="content_row">
        <div class="container">
          <div class="col col-title">Application Engineer</div>
          <div class="col col-business">Anderson Greenwood Crosby Sanmar Limited / Xomox Sanmar Limited</div>
          <div class="col col-location">Viralimalai, Trichy</div>
          <div class="col col-exp">5 - 8 years</div>
          <div class="col col-apply">
            <a href="https://www.sanmargroup.com/working-at-sanmar/opportunities/application-engineer/" class="apply-now">Explore</a>
          </div>
        </div>
      </div>
    `,
    post_count: 2,
  },
}

test('Sanmar Engineering validates the official careers page and engineering business-area filters', async () => {
  const sanmarEngineering = await loadSanmarEngineeringModule()

  assert.equal(sanmarEngineering.SOURCE, 'sanmarengineering')
  assert.equal(sanmarEngineering.COMPANY, 'The Sanmar Group (Sanmar Engineering)')
  assert.equal(sanmarEngineering.CAREERS_URL, 'https://www.sanmargroup.com/working-at-sanmar/opportunities/')
  assert.equal(sanmarEngineering.AJAX_URL, 'https://www.sanmargroup.com/wp-admin/admin-ajax.php')
  assert.deepEqual(sanmarEngineering.ENGINEERING_BUSINESS_AREAS, [
    'Flowserve Sanmar Private Limited',
    'Anderson Greenwood Crosby Sanmar Limited / Xomox Sanmar Limited',
  ])
  assert.equal(sanmarEngineering.hasOfficialCareersSurface(careersPageHtml), true)
  assert.deepEqual(
    sanmarEngineering.extractEngineeringBusinessAreas(careersPageHtml),
    sanmarEngineering.ENGINEERING_BUSINESS_AREAS,
  )
})

test('extractListingsFromHtml parses official Sanmar engineering cards from ajax html', async () => {
  const sanmarEngineering = await loadSanmarEngineeringModule()

  assert.deepEqual(
    sanmarEngineering.extractListingsFromHtml(flowservePageOnePayload.data.html),
    [
      {
        title: 'Customer Service',
        businessArea: 'Flowserve Sanmar Private Limited',
        location: 'Delhi, Mumbai, Pune, Baroda, Kolkata & Chennai',
        experienceRequired: '5 - 8 years',
        sourceUrl: 'https://www.sanmargroup.com/working-at-sanmar/opportunities/customer-service/',
      },
      {
        title: 'Application Engineer',
        businessArea: 'Flowserve Sanmar Private Limited',
        location: 'Karapakkam, Chennai',
        experienceRequired: '5 - 8 years',
        sourceUrl: 'https://www.sanmargroup.com/working-at-sanmar/opportunities/application-engineer-flowserve/',
      },
    ],
  )
})

test('run fetches the official Sanmar careers page, paginates engineering business areas, and returns India jobs', async () => {
  const sanmarEngineering = await loadSanmarEngineeringModule()
  const requestedTexts = []
  const requestedJson = []

  const jobs = await sanmarEngineering.createSanmarEngineeringScraper({ maxJobs: 4 }).run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      if (url === sanmarEngineering.CAREERS_URL) return careersPageHtml
      throw new Error(`Unexpected Sanmar careers page URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requestedJson.push([url, options])
      const params = new URLSearchParams(options.body)
      const businessArea = params.get('business_area')
      const paged = params.get('paged')

      if (businessArea === sanmarEngineering.ENGINEERING_BUSINESS_AREAS[0] && paged === '1') {
        return flowservePageOnePayload
      }
      if (businessArea === sanmarEngineering.ENGINEERING_BUSINESS_AREAS[0] && paged === '2') {
        return flowservePageTwoPayload
      }
      if (businessArea === sanmarEngineering.ENGINEERING_BUSINESS_AREAS[1] && paged === '1') {
        return agcslPageOnePayload
      }

      throw new Error(`Unexpected Sanmar AJAX request: ${businessArea} page ${paged}`)
    },
  })

  assert.deepEqual(requestedTexts, [sanmarEngineering.CAREERS_URL])
  assert.deepEqual(
    requestedJson.map(([url, options]) => {
      const params = new URLSearchParams(options.body)
      return [
        url,
        params.get('action'),
        params.get('template_file'),
        params.get('business_area'),
        params.get('paged'),
      ]
    }),
    [
      [
        sanmarEngineering.AJAX_URL,
        'filter_career_posts',
        'template-parts/dropdown-filter-layouts/career-post-layout',
        'Flowserve Sanmar Private Limited',
        '1',
      ],
      [
        sanmarEngineering.AJAX_URL,
        'filter_career_posts',
        'template-parts/dropdown-filter-layouts/career-post-layout',
        'Flowserve Sanmar Private Limited',
        '2',
      ],
      [
        sanmarEngineering.AJAX_URL,
        'filter_career_posts',
        'template-parts/dropdown-filter-layouts/career-post-layout',
        'Anderson Greenwood Crosby Sanmar Limited / Xomox Sanmar Limited',
        '1',
      ],
    ],
  )

  assert.equal(jobs.length, 4)
  assert.deepEqual(jobs[0], {
    title: 'Customer Service',
    company: 'The Sanmar Group (Sanmar Engineering)',
    department: 'Flowserve Sanmar Private Limited',
    location: 'Delhi, Mumbai, Pune, Baroda, Kolkata & Chennai',
    city: null,
    country: 'India',
    source: 'sanmarengineering',
    jobId: 'customer-service',
    requisitionId: 'customer-service',
    sourceUrl: 'https://www.sanmargroup.com/working-at-sanmar/opportunities/customer-service/',
    applyUrl: 'https://www.sanmargroup.com/working-at-sanmar/opportunities/customer-service/',
    link: 'https://www.sanmargroup.com/working-at-sanmar/opportunities/customer-service/',
    employmentType: null,
    experienceRequired: '5 - 8 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'Business area: Flowserve Sanmar Private Limited. Location: Delhi, Mumbai, Pune, Baroda, Kolkata & Chennai. Experience: 5 - 8 years.',
    remoteStatus: null,
    scrapedAt: jobs[0].scrapedAt,
  })
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
  assert.equal(jobs[1].city, 'Chennai')
  assert.equal(jobs[2].jobId, 'product-engineer-flowserve')
  assert.equal(jobs[2].city, 'Chennai')
  assert.equal(
    jobs[3].department,
    'Anderson Greenwood Crosby Sanmar Limited / Xomox Sanmar Limited',
  )
})
