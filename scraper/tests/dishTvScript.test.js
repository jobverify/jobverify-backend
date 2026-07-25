import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-15T00:00:00.000Z'

const VERIFIED_OPENINGS = [
  {
    title: 'Freelance',
    department: 'Others',
    location: 'Any',
    experience: 'Fresher',
    applyUrl: 'https://forms.office.com/r/57DD6f1beK',
    contactName: 'Mr. Kuldeep Kumar',
    contactEmail: 'kuldeep.kumar@dishtv.in',
    customHeading: 'Job Description',
    customHtml:
      '<p>Earn from home Opportunity for Students/House Wives/Retired/VRS/Fresher&apos;s/Experienced with good Hindi &amp; English communication skills.</p><p><b>Click on below link &amp; fill the form. Our team will contact you shortly :</b></p>',
  },
  {
    title: 'Area Sales Executive/ Manager - CE Sales',
    department: 'Sales',
    location: 'Bathinda, Amritsar, Surat, Pune, Gandhidham, Jabalpur, Bhopal, Medinipur, Guwahati',
    experience: '5+ Years',
    applyUrl: 'https://forms.gle/BEfVZeaiva7ovzUH7',
    contactName: 'Mr. Shubham Panwar',
    contactEmail: 'shubham.panwar@dishd2h.com | anjali.singh.hr@d2hdesk.com',
    customHeading: 'Key Responsibilities',
    customHtml:
      '<ul><li>Drive primary and secondary sales through channel partners.</li><li>Need to achieve value, volume and revenue targets.</li></ul>',
  },
  {
    title: 'Area Sales Executive/ Manager - DTH Sales',
    department: 'Sales',
    location: 'Karimnagar, Tirupati, Vijayawada, Bolangir, Bhagalpur, North 24 pargana, Aurangabad, Davangere',
    experience: '5+ Years',
    applyUrl: 'https://forms.gle/BEfVZeaiva7ovzUH7',
    contactName: 'Mr. Shubham Panwar',
    contactEmail: 'shubham.panwar@dishd2h.com | suraj.maurya.hr@dishtv.net.in',
    customHeading: 'Key Responsibilities',
    customHtml:
      '<ul><li>Drive DTH sales growth across assigned territories.</li><li>Manage distributor relationships and field execution.</li></ul>',
  },
  {
    title: 'Area Sales Manager - DTH Sales',
    department: 'Sales',
    location: 'Raipur (Chhattisgarh), Karimnagar (Telangana), Keonjhar (Odisha), Hazaribagh (Jharkhand), Solapur (Maharashtra), Jalgaon (Maharashtra), Indore (MP)',
    experience: '3+ Years',
    applyUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSej4K2W9yDd80PMpjWr70Cl-0AojRKfkQz_XXEFcOBfAS56Iw/viewform',
    contactName: 'Mr. Shubham Panwar',
    contactEmail: 'shubham.panwar@dishd2h.com | suraj.maurya.hr@dishtv.net.in',
    customHeading: 'Key Responsibilities',
    customHtml:
      '<ul><li>Analyze market trends and competitor activities.</li><li>Looking for General Trade majorly.</li></ul>',
  },
  {
    title: 'Area Sales Executive/ Manager',
    department: 'Sales',
    location: 'Jalandhar, Gulbarga, Jaipur, Delhi, Ongole, Tirupati',
    experience: '4+ Years',
    applyUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSej4K2W9yDd80PMpjWr70Cl-0AojRKfkQz_XXEFcOBfAS56Iw/viewform',
    contactName: 'Mr. Shubham Panwar',
    contactEmail: 'shubham.panwar@dishd2h.com | suraj.maurya.hr@dishtv.net.in',
    customHeading: 'Key Responsibilities',
    customHtml:
      '<ul><li>Execute territory plans.</li><li>Manage local channel performance.</li></ul>',
  },
  {
    title: 'Front End Developer (React JS)',
    department: 'IT',
    location: 'Noida',
    experience: '3+ Years',
    applyUrl: 'https://forms.gle/dFnzUM3Kyt1syAne6',
    contactName: 'Ritu Pilkhwal',
    contactEmail: 'ritu.pilkhwal.hr@d2hdesk.com',
    customHeading: 'What we need?',
    customHtml:
      '<ul><li>Expert knowledge of React JS / Redux / Sagas</li><li>Expert in building extra-ordinary User Interfaces - HTML5, CSS3, JSX, SCSS etc</li><li>Exposure to Unit testing and CI / CD using any tools mandatory AWS, Bamboo, Github Actions, Jenkins etc</li></ul>',
  },
  {
    title: 'Android TV Developer',
    department: 'IT',
    location: 'Noida',
    experience: '2+ Years',
    applyUrl: 'https://forms.gle/NH3AjeFForPiAeES6',
    contactName: 'Ritu Pilkhwal',
    contactEmail: 'ritu.pilkhwal.hr@d2hdesk.com',
    customHeading: 'What we need?',
    customHtml:
      '<ul><li>Java, Kotlin, Clean Architecture, RxJava, Dagger, Retrofit, MVVM, Jetpack</li><li>Android TV, Leanback Library and exposure to ExoPlayer, DVB players and DRM</li></ul>',
  },
  {
    title: 'IOS Developer',
    department: 'IT',
    location: 'Noida',
    experience: '3+ Years',
    applyUrl: 'https://forms.gle/NH3AjeFForPiAeES6',
    contactName: 'Ritu Pilkhwal',
    contactEmail: 'ritu.pilkhwal.hr@d2hdesk.com',
    customHeading: 'What we need?',
    customHtml:
      '<ul><li>Excellent programming skills in Swift programming language</li><li>Experience with video streaming is a big plus with Players and DRM know-hows</li></ul>',
  },
  {
    title: 'Senior Snowflake Data Engineer',
    department: 'IT',
    location: 'Noida',
    experience: '6+ Years',
    applyUrl: 'https://forms.gle/NH3AjeFForPiAeES6',
    contactName: 'Ritu Pilkhwal',
    contactEmail: 'ritu.pilkhwal.hr@d2hdesk.com',
    customHeading: 'What will you do?',
    customHtml:
      '<ul><li>Design and implement scalable data pipelines and cloud data warehouse architecture.</li><li>Build and maintain high-performance ELT workflows in Snowflake.</li></ul>',
  },
  {
    title: 'Divisional Manager- Brand & BTL',
    department: '',
    location: 'Noida',
    experience: '6+ Years',
    applyUrl: 'https://forms.gle/NH3AjeFForPiAeES6',
    contactName: 'Mr. Shubham Panwar',
    contactEmail: 'shubham.panwar@dishd2h.com',
    customHeading: 'Nice to Have',
    customHtml:
      '<ul><li>Experience in subscription-based businesses</li><li>Experience with large-scale campaigns</li></ul>',
  },
  {
    title: 'Area Sales Executive/ Manager - DTH Sales',
    department: 'Sales',
    location: '',
    experience: '5+ Years',
    applyUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSej4K2W9yDd80PMpjWr70Cl-0AojRKfkQz_XXEFcOBfAS56Iw/viewform?usp=publish-editor',
    contactName: 'Mr. Shubham Panwar',
    contactEmail: 'shubham.panwar@dishd2h.com',
    customHeading: 'Preferred Industry',
    customHtml: '<p>Telecom, DTH</p>',
  },
  {
    title: 'Area Sales Executive/ Manager - CE Sales',
    department: 'Sales',
    location: '',
    experience: '5+ Years',
    applyUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSej4K2W9yDd80PMpjWr70Cl-0AojRKfkQz_XXEFcOBfAS56Iw/viewform?usp=publish-editor',
    contactName: 'Mr. Shubham Panwar',
    contactEmail: 'shubham.panwar@dishd2h.com',
    customHeading: 'Roles & Responsibilities of CE',
    customHtml:
      '<ul><li>Handling key accounts Consumer Durable and Consumer Electronics distribution.</li><li>Distribution handling (Primary/ Secondary Sales)</li></ul>',
  },
  {
    title: 'Product Manager',
    department: 'Managment',
    location: '',
    experience: '5+ Years',
    applyUrl: 'https://forms.gle/dFnzUM3Kyt1syAne6',
    contactName: 'Mr. Shubham Panwar',
    contactEmail: 'shubham.panwar@dishd2h.com',
    customHeading: 'Responsibilities',
    customHtml:
      '<ul><li>Track and improve key metrics such as Acquisition, ARPU, conversion, retention, and revenue contribution.</li><li>Present data-backed insights and recommendations to senior leadership.</li></ul>',
  },
]

const buildJobCardHtml = (opening) => `
  <div class="jobCard">
    <div class="job-card"${opening.department ? ` data-department="${opening.department}"` : ''}${opening.location ? ` data-location="${opening.location}"` : ''}${opening.experience ? ` data-experience="${opening.experience}"` : ''}>
      <div class="job-card__header">
        <div class="job-card__header-left">
          <h3 class="job-card__title">${opening.title}</h3>
          <div class="job-card__meta">
            ${opening.department ? `<span class="badge badge--dept">${opening.department}</span>` : ''}
            ${opening.location ? `<span class="meta-tag"><span class="meta-tag__icon">Location</span> ${opening.location}</span>` : '<span class="meta-tag"></span>'}
            ${opening.experience ? `<span class="meta-tag"><span class="meta-tag__icon">Experience</span> ${opening.experience}</span>` : ''}
            <div class="job-card__custom-field">
              <h4 class="job-card__custom-heading">${opening.customHeading}</h4>
              <div class="job-card__custom-desc">${opening.customHtml}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="job-card__footer">
        <a href="${opening.applyUrl}" class="job-card__apply-btn" target="_blank" rel="noopener noreferrer">Apply Now</a>
        <p class="job-card__contact">
          For any queries you may contact <strong>${opening.contactName}</strong> at
          <a href="mailto:${opening.contactEmail}">${opening.contactEmail}</a>
        </p>
      </div>
    </div>
  </div>
`

const homepagePage = {
  status: 200,
  url: 'https://www.dishtv.in/',
  html: `
    <!doctype html>
    <html lang="en">
      <head>
        <title>DishTV Recharge Online & New DTH Connection</title>
        <link rel="canonical" href="https://www.dishtv.in/">
      </head>
      <body>
        <h1>Snack on the content you love.</h1>
        <footer>
          <a href="/about-us.html">About Us</a>
          <a href="/careers.html">Careers</a>
          <a href="/privacy-policy.html">Privacy Policy</a>
        </footer>
      </body>
    </html>
  `,
}

const sitemapXml = `
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://www.dishtv.in/</loc></url>
    <url><loc>https://www.dishtv.in/about-us.html</loc></url>
    <url><loc>https://www.dishtv.in/careers.html</loc></url>
  </urlset>
`

const careersPage = {
  status: 200,
  url: 'https://www.dishtv.in/careers.html',
  html: `
    <!doctype html>
    <html lang="en">
      <head>
        <title>DISHTV Jobs - Job Openings in DISHTV</title>
        <meta name="description" content="Find latest openings in DISHTV. Search &amp; Apply now!">
        <meta property="og:url" content="https://www.dishtv.in/careers.html">
        <link rel="canonical" href="https://www.dishtv.in/careers.html">
      </head>
      <body>
        <div class="cmp-teaser__action-container">
          <a href="mailto:jobs@dishd2h.com">jobs@dishd2h.com</a>
        </div>
        <ol role="tablist" class="cmp-tabs__tablist">
          <li role="tab">OUR PHILOSOPHY</li>
          <li role="tab">WHY JOIN DISHTV</li>
          <li role="tab">CURRENT OPENINGS</li>
        </ol>
        <div class="jobListings">
          <div class="job-listings">
            <div class="job-listings__filters">
              <label class="job-listings__filter-label">Location</label>
              <select class="job-listings__select" data-filter="location">
                <option value="">All Locations</option>
              </select>
              <label class="job-listings__filter-label">Experience</label>
              <select class="job-listings__select" data-filter="experience">
                <option value="">All Experience Levels</option>
              </select>
            </div>
            <p class="job-listings__results-meta">Showing <span class="job-listings__count">13</span> openings</p>
            <div class="job-listings__cards">
              ${VERIFIED_OPENINGS.map((opening) => buildJobCardHtml(opening)).join('\n')}
            </div>
            <div class="job-listings__no-results" hidden>
              <p class="job-listings__no-results-text">No openings match your search. Try adjusting the filters.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `,
}

const loadDishTvModule = async () => {
  try {
    return await import('../dishtv/script.js')
  } catch {
    assert.fail('Expected DishTV scraper module at ../dishtv/script.js')
  }
}

test('DishTV constants and extractors stay pinned to the verified first-party careers surface and current openings', async () => {
  const dishTv = await loadDishTvModule()

  assert.equal(dishTv.COMPANY_NAME, 'DishTV')
  assert.equal(dishTv.SOURCE, 'dishtv')
  assert.equal(dishTv.COUNTRY_FILTER, 'India')
  assert.equal(dishTv.HOMEPAGE_URL, 'https://www.dishtv.in/')
  assert.equal(dishTv.CAREERS_PAGE_URL, 'https://www.dishtv.in/careers.html')
  assert.equal(dishTv.SITEMAP_URL, 'https://www.dishtv.in/sitemap.xml')
  assert.equal(dishTv.JOBS_CONTACT_EMAIL, 'jobs@dishd2h.com')
  assert.equal(dishTv.SAMPLE_APPLY_URL, 'https://forms.office.com/r/57DD6f1beK')
  assert.equal(dishTv.VERIFIED_ON, '2026-07-15')
  assert.equal(dishTv.hasOfficialHomepageSignal(homepagePage), true)
  assert.equal(dishTv.sitemapIncludesCareersPage(sitemapXml), true)
  assert.equal(dishTv.hasOfficialCareersPageSignal(careersPage), true)

  const cards = dishTv.extractJobCards(careersPage.html)
  assert.equal(cards.length, 13)
  assert.deepEqual(
    cards.map((card) => ({
      title: card.title,
      department: card.department,
      location: card.location,
      experience: card.experience,
      applyUrl: card.applyUrl,
      contactName: card.contactName,
      contactEmail: card.contactEmail,
    })),
    VERIFIED_OPENINGS.map((opening) => ({
      title: opening.title,
      department: opening.department || null,
      location: opening.location || null,
      experience: opening.experience || null,
      applyUrl: opening.applyUrl,
      contactName: opening.contactName,
      contactEmail: opening.contactEmail,
    })),
  )

  const reactJob = dishTv.buildJobFromCard(cards[5])
  assert.deepEqual(
    {
      title: reactJob.title,
      department: reactJob.department,
      location: reactJob.location,
      city: reactJob.city,
      state: reactJob.state,
      country: reactJob.country,
      applyUrl: reactJob.applyUrl,
      sourceUrl: reactJob.sourceUrl,
      experienceRequired: reactJob.experienceRequired,
      contactName: reactJob.contactName,
      contactEmail: reactJob.contactEmail,
      employmentType: reactJob.employmentType,
      postingDate: reactJob.postingDate,
      closingDate: reactJob.closingDate,
    },
    {
      title: 'Front End Developer (React JS)',
      department: 'IT',
      location: 'Noida',
      city: 'Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      applyUrl: 'https://forms.gle/dFnzUM3Kyt1syAne6',
      sourceUrl: 'https://www.dishtv.in/careers.html',
      experienceRequired: '3+ Years',
      contactName: 'Ritu Pilkhwal',
      contactEmail: 'ritu.pilkhwal.hr@d2hdesk.com',
      employmentType: null,
      postingDate: null,
      closingDate: null,
    },
  )
  assert.match(reactJob.jobId, /^dishtv-/)
  assert.equal(reactJob.requisitionId, reactJob.jobId)
  assert.ok(reactJob.requiredSkills.includes('Expert knowledge of React JS / Redux / Sagas'))
  assert.match(reactJob.jobDescription, /Exposure to Unit testing and CI \/ CD/i)

  const brandJob = dishTv.buildJobFromCard(cards[9])
  assert.equal(brandJob.department, null)
  assert.equal(brandJob.location, 'Noida')
  assert.equal(brandJob.city, 'Noida')

  const productManager = dishTv.buildJobFromCard(cards[12])
  assert.equal(productManager.department, 'Managment')
  assert.equal(productManager.location, null)
  assert.equal(productManager.city, null)
  assert.ok(productManager.requiredSkills.includes('Present data-backed insights and recommendations to senior leadership.'))
})

test('run validates the verified DishTV homepage, sitemap, and careers page and returns the current public openings', async () => {
  const dishTv = await loadDishTvModule()
  const requestedUrls = []

  const jobs = await dishTv.createDishTvScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === dishTv.HOMEPAGE_URL) return homepagePage
      if (url === dishTv.SITEMAP_URL) return { status: 200, url, html: sitemapXml }
      if (url === dishTv.CAREERS_PAGE_URL) return careersPage

      throw new Error(`Unexpected DishTV URL: ${url}`)
    },
    now: () => FIXED_SCRAPED_AT,
  })

  assert.deepEqual(requestedUrls, [
    dishTv.HOMEPAGE_URL,
    dishTv.SITEMAP_URL,
    dishTv.CAREERS_PAGE_URL,
  ])
  assert.equal(jobs.length, 13)
  assert.deepEqual(
    jobs.slice(0, 3).map((job) => ({
      title: job.title,
      department: job.department,
      location: job.location,
      experienceRequired: job.experienceRequired,
      applyUrl: job.applyUrl,
      source: job.source,
      link: job.link,
      scrapedAt: job.scrapedAt,
    })),
    [
      {
        title: 'Freelance',
        department: 'Others',
        location: 'Any',
        experienceRequired: 'Fresher',
        applyUrl: 'https://forms.office.com/r/57DD6f1beK',
        source: 'dishtv',
        link: 'https://forms.office.com/r/57DD6f1beK',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        title: 'Area Sales Executive/ Manager - CE Sales',
        department: 'Sales',
        location: 'Bathinda, Amritsar, Surat, Pune, Gandhidham, Jabalpur, Bhopal, Medinipur, Guwahati',
        experienceRequired: '5+ Years',
        applyUrl: 'https://forms.gle/BEfVZeaiva7ovzUH7',
        source: 'dishtv',
        link: 'https://forms.gle/BEfVZeaiva7ovzUH7',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        title: 'Area Sales Executive/ Manager - DTH Sales',
        department: 'Sales',
        location: 'Karimnagar, Tirupati, Vijayawada, Bolangir, Bhagalpur, North 24 pargana, Aurangabad, Davangere',
        experienceRequired: '5+ Years',
        applyUrl: 'https://forms.gle/BEfVZeaiva7ovzUH7',
        source: 'dishtv',
        link: 'https://forms.gle/BEfVZeaiva7ovzUH7',
        scrapedAt: FIXED_SCRAPED_AT,
      },
    ],
  )
  assert.equal(jobs[5].city, 'Noida')
  assert.equal(jobs[12].location, null)
})

test('DishTV scraper fails closed when the verified homepage, sitemap, careers page, or public job cards drift', async () => {
  const dishTv = await loadDishTvModule()

  await assert.rejects(
    dishTv.createDishTvScraper().run({
      fetchPage: async (url) => {
        if (url === dishTv.HOMEPAGE_URL) {
          return {
            ...homepagePage,
            html: homepagePage.html.replace('/careers.html', '/investors.html'),
          }
        }

        throw new Error(`Unexpected DishTV URL: ${url}`)
      },
    }),
    /official homepage/i,
  )

  await assert.rejects(
    dishTv.createDishTvScraper().run({
      fetchPage: async (url) => {
        if (url === dishTv.HOMEPAGE_URL) return homepagePage
        if (url === dishTv.SITEMAP_URL) {
          return {
            status: 200,
            url,
            html: sitemapXml.replace('https://www.dishtv.in/careers.html', 'https://www.dishtv.in/privacy-policy.html'),
          }
        }

        throw new Error(`Unexpected DishTV URL: ${url}`)
      },
    }),
    /sitemap/i,
  )

  await assert.rejects(
    dishTv.createDishTvScraper().run({
      fetchPage: async (url) => {
        if (url === dishTv.HOMEPAGE_URL) return homepagePage
        if (url === dishTv.SITEMAP_URL) return { status: 200, url, html: sitemapXml }
        if (url === dishTv.CAREERS_PAGE_URL) {
          return {
            ...careersPage,
            html: careersPage.html.replace('CURRENT OPENINGS', 'TEAM SPOTLIGHT'),
          }
        }

        throw new Error(`Unexpected DishTV URL: ${url}`)
      },
    }),
    /careers page/i,
  )

  await assert.rejects(
    dishTv.createDishTvScraper().run({
      fetchPage: async (url) => {
        if (url === dishTv.HOMEPAGE_URL) return homepagePage
        if (url === dishTv.SITEMAP_URL) return { status: 200, url, html: sitemapXml }
        if (url === dishTv.CAREERS_PAGE_URL) {
          return {
            ...careersPage,
            html: careersPage.html.replace('https://forms.office.com/r/57DD6f1beK', 'https://www.linkedin.com/jobs/view/12345'),
          }
        }

        throw new Error(`Unexpected DishTV URL: ${url}`)
      },
    }),
    /current openings/i,
  )
})
