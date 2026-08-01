import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-15T09:30:00.000Z'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>DronaHQ | Enterprise platform to build apps and agents faster</title>
    <script type="application/ld+json">
      {
        "@type": "Organization",
        "name": "DronaHQ",
        "url": "https://www.dronahq.com/",
        "foundingOrganization": {
          "@type": "Organization",
          "name": "Deltecs Infotech Pvt Ltd"
        },
        "sameAs": [
          "https://www.linkedin.com/company/deltecs-infotech"
        ]
      }
    </script>
  </head>
  <body>
    <nav>
      <a href="/careers/">Careers</a>
      <a href="/pricing/">Pricing</a>
    </nav>
    <main>
      <h1>DronaHQ</h1>
      <p>DronaHQ is a low-code and agentic AI platform to build internal apps, AI agents, and automations faster.</p>
    </main>
    <footer>Copyright © Deltecs Infotech Pvt Ltd. All Rights Reserved.</footer>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at DronaHQ</title>
    <meta
      name="description"
      content="Join the team behind DronaHQ, an AI-powered developer platform used by top engineering teams to build operational apps. Explore open roles >"
    />
  </head>
  <body>
    <main>
      <section>
        <h2>Open Positions at DronaHQ</h2>
        <div class="job-card">
          <div class="job-info">
            <h3>
              <a href="https://www.dronahq.com/career/b2b-tech-marketing-intern-developer-platform/">
                B2B Tech Marketing Intern (Developer Platform)
              </a>
            </h3>
            <div class="job-other-info">
              <span>Mumbai, Maharashtra, India</span>
              <span>Hybrid</span>
              <span>Fresher</span>
            </div>
          </div>
          <a href="https://www.dronahq.com/career/b2b-tech-marketing-intern-developer-platform/" class="apply-btn">
            Apply now
          </a>
        </div>
        <div class="job-card">
          <div class="job-info">
            <h3>
              <a href="https://www.dronahq.com/career/qa-lead/">
                QA Lead \u2013 SaaS (Low-Code/No-Code)
              </a>
            </h3>
            <div class="job-other-info">
              <span>Mumbai, Maharashtra, India</span>
              <span>Hybrid</span>
              <span>5+Years</span>
            </div>
          </div>
          <a href="https://www.dronahq.com/career/qa-lead/" class="apply-btn">Apply now</a>
        </div>
        <div class="job-card">
          <div class="job-info">
            <h3>
              <a href="https://www.dronahq.com/career/legal-executive/">Legal Executive</a>
            </h3>
            <div class="job-other-info">
              <span>Mumbai, Maharashtra, India</span>
              <span>Hybrid</span>
              <span>2 - 3 years</span>
            </div>
          </div>
          <a href="https://www.dronahq.com/career/legal-executive/" class="apply-btn">Apply now</a>
        </div>
        <div class="job-card">
          <div class="job-info">
            <h3>
              <a href="https://www.dronahq.com/career/b2b-saas-marketer/">B2B SaaS Marketer</a>
            </h3>
            <div class="job-other-info">
              <span>Mumbai, Maharashtra, India</span>
              <span>Hybrid</span>
              <span>0.5 - 2 years</span>
            </div>
          </div>
          <a href="https://www.dronahq.com/career/b2b-saas-marketer/" class="apply-btn">Apply now</a>
        </div>
      </section>
    </main>
    <footer>Copyright © Deltecs Infotech Pvt Ltd. All Rights Reserved.</footer>
  </body>
</html>
`

const marketingInternDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>B2B Tech Marketing Intern (Developer Platform) - DronaHQ</title>
  </head>
  <body>
    <main>
      <div class="job-hero-banner-wrapper">
        <div class="job-title-and-description">
          <h1 class="job-title">B2B Tech Marketing Intern (Developer Platform)</h1>
          <div class="job-location-wrapper-and-othre-info">
            <div class="job-location-wrapper">
              <span class="location">Location</span>
              <span>
                <span>Mumbai, Maharashtra, India</span>
                <span class="wokr-type">Hybrid</span>
              </span>
            </div>
            <div class="job-type-wrapper">
              <span>Job type</span>
              <span>Full-time</span>
            </div>
            <div class="job-experience">
              <span>Experience</span>
              <span>Fresher</span>
            </div>
          </div>
          <div class="apply-and-share-url-wrapper">
            <a data-job-title="B2B Tech Marketing Intern (Developer Platform)" class="apply-btn">Apply now</a>
            <div class="job-url-wrapper">https://www.dronahq.com/career/b2b-tech-marketing-intern-developer-platform/</div>
          </div>
        </div>
      </div>
      <div class="job-summary-wrapper">
        <h2>Role Overview</h2>
        <div class="summary-description">
          <p>
            Are you a tech-savvy storyteller who loves APIs, agents, and JavaScript?<br />
            Do you enjoy building small projects, hosting dev meetups, and vibing with the developer community?<br />
            We're looking for a Tech Marketing Intern to help grow our B2B developer platform.
          </p>
        </div>
      </div>
      <div class="job-responsibilities-wrapper">
        <h2>Key Responsibilities</h2>
        <div class="job-section-description">
          <p>
            Build small code demos &amp; integrations using JavaScript, APIs, and agent frameworks<br />
            • Organize or co-host local dev meetups, hack nights, and community events<br />
            • Create engaging content \u2013 from short videos to technical blog posts and memes
          </p>
        </div>
      </div>
      <div class="job-responsibilities-wrapper">
        <div class="job-section-with-title-description">
          <h3 class="title-wrapper">Must-Have Skills</h3>
        </div>
        <div class="job-section-description">
          <ul>
            <li>
              You're based in Mumbai and plugged into local dev/tech scenes<br />
              • You like building with APIs, JS, tools, and frameworks<br />
              • You enjoy explaining tech in fun, clear, creative ways
            </li>
          </ul>
        </div>
      </div>
      <div class="job-responsibilities-wrapper">
        <h2><b>Why join us?</b></h2>
        <div class="job-section-description">
          <ul>
            <li>Be part of an innovative SaaS company shaping the Low-Code/No-Code industry.</li>
            <li>Bonus points for personal websites, GitHub, or dev-related socials.</li>
          </ul>
        </div>
      </div>
    </main>
  </body>
</html>
`

const qaLeadDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>QA Lead \u2013 SaaS - DronaHQ</title>
  </head>
  <body>
    <main>
      <div class="job-hero-banner-wrapper">
        <div class="job-title-and-description">
          <h1 class="job-title">QA Lead \u2013 SaaS (Low-Code/No-Code)</h1>
          <div class="job-location-wrapper-and-othre-info">
            <div class="job-location-wrapper">
              <span class="location">Location</span>
              <span>
                <span>Mumbai, Maharashtra, India</span>
                <span class="wokr-type">Hybrid</span>
              </span>
            </div>
            <div class="job-type-wrapper">
              <span>Job type</span>
              <span>Full-time</span>
            </div>
            <div class="job-experience">
              <span>Experience</span>
              <span>5+Years</span>
            </div>
          </div>
          <div class="apply-and-share-url-wrapper">
            <a data-job-title="QA Lead \u2013 SaaS (Low-Code/No-Code)" class="apply-btn">Apply now</a>
            <div class="job-url-wrapper">https://www.dronahq.com/career/qa-lead/</div>
          </div>
        </div>
      </div>
      <div class="job-summary-wrapper">
        <h2>Role Overview</h2>
        <div class="summary-description">
          <p>
            Lead and evolve the QA function for a fast-scaling low-code SaaS platform.<br />
            Build processes that raise release quality across product, engineering, and support.
          </p>
        </div>
      </div>
      <div class="job-responsibilities-wrapper">
        <h2>Key Responsibilities</h2>
        <div class="job-section-description">
          <ul>
            <li>Define and improve the QA strategy across manual and automated testing.</li>
            <li>Foster a culture of continuous improvement across product, engineering, and support teams.</li>
          </ul>
        </div>
      </div>
      <div class="job-responsibilities-wrapper">
        <div class="job-section-with-title-description">
          <h3 class="title-wrapper">Must-Have Skills</h3>
        </div>
        <div class="job-section-description">
          <p><strong>Education</strong></p>
          <ul>
            <li>Bachelor's/Master's degree in Computer Science, Software Engineering, or related field.</li>
          </ul>
          <p><strong>Experience</strong></p>
          <ul>
            <li>5+ years in SaaS QA, testing, or quality management (experience with Low-Code/No-Code preferred).</li>
          </ul>
          <p><strong>Certifications (preferred)</strong></p>
          <ul>
            <li>ISTQB, Six Sigma, Agile/DevOps certifications are a plus.</li>
          </ul>
        </div>
      </div>
      <div class="job-responsibilities-wrapper">
        <h2><b>Why join us?</b></h2>
        <div class="job-section-description">
          <ul>
            <li>Be part of an innovative SaaS company shaping the Low-Code/No-Code industry.</li>
            <li>Work with cutting-edge technology and drive product excellence.</li>
          </ul>
        </div>
      </div>
    </main>
  </body>
</html>
`

const loadDeltecsModule = async () => {
  try {
    return await import('../../scraper/deltecs/script.js')
  } catch {
    assert.fail('Expected Deltecs scraper module at ../../scraper/deltecs/script.js')
  }
}

test('Deltecs scraper keeps the verified DronaHQ homepage, careers listing cards, and job detail shape explicit', async () => {
  const deltecs = await loadDeltecsModule()

  assert.equal(deltecs.COMPANY, 'Deltecs')
  assert.equal(deltecs.PUBLIC_BRAND_NAME, 'DronaHQ')
  assert.equal(deltecs.OFFICIAL_BRAND_NAME, 'Deltecs Infotech Pvt Ltd')
  assert.equal(deltecs.SOURCE, 'deltecs')
  assert.equal(deltecs.VERIFIED_AT, '2026-07-15')
  assert.equal(deltecs.HOMEPAGE_URL, 'https://www.dronahq.com/')
  assert.equal(deltecs.CAREERS_URL, 'https://www.dronahq.com/careers/')
  assert.equal(deltecs.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(deltecs.hasOfficialCareersPageSignal(careersHtml), true)

  const listings = deltecs.extractListings(careersHtml)
  assert.deepEqual(listings, [
    {
      title: 'B2B Tech Marketing Intern (Developer Platform)',
      sourceUrl: 'https://www.dronahq.com/career/b2b-tech-marketing-intern-developer-platform/',
      location: 'Mumbai, Maharashtra, India',
      workplaceType: 'Hybrid',
      experienceRequired: 'Fresher',
    },
    {
      title: 'QA Lead \u2013 SaaS (Low-Code/No-Code)',
      sourceUrl: 'https://www.dronahq.com/career/qa-lead/',
      location: 'Mumbai, Maharashtra, India',
      workplaceType: 'Hybrid',
      experienceRequired: '5+Years',
    },
    {
      title: 'Legal Executive',
      sourceUrl: 'https://www.dronahq.com/career/legal-executive/',
      location: 'Mumbai, Maharashtra, India',
      workplaceType: 'Hybrid',
      experienceRequired: '2 - 3 years',
    },
    {
      title: 'B2B SaaS Marketer',
      sourceUrl: 'https://www.dronahq.com/career/b2b-saas-marketer/',
      location: 'Mumbai, Maharashtra, India',
      workplaceType: 'Hybrid',
      experienceRequired: '0.5 - 2 years',
    },
  ])

  assert.equal(
    deltecs.hasOfficialJobDetailSignal(marketingInternDetailHtml, listings[0]),
    true,
  )
  assert.equal(deltecs.hasOfficialJobDetailSignal(qaLeadDetailHtml, listings[1]), true)

  assert.deepEqual(
    deltecs.extractJobDetail(marketingInternDetailHtml, listings[0]),
    {
      title: 'B2B Tech Marketing Intern (Developer Platform)',
      company: 'Deltecs',
      department: null,
      location: 'Mumbai, Maharashtra, India',
      city: 'Mumbai',
      country: 'India',
      jobId: 'deltecs-b2b-tech-marketing-intern-developer-platform',
      requisitionId: 'deltecs-b2b-tech-marketing-intern-developer-platform',
      sourceUrl: 'https://www.dronahq.com/career/b2b-tech-marketing-intern-developer-platform/',
      applyUrl: 'https://www.dronahq.com/career/b2b-tech-marketing-intern-developer-platform/',
      employmentType: 'Full-time',
      workplaceType: 'Hybrid',
      experienceRequired: 'Fresher',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Build small code demos & integrations using JavaScript, APIs, and agent frameworks',
        'Organize or co-host local dev meetups, hack nights, and community events',
        'Create engaging content \u2013 from short videos to technical blog posts and memes',
        "You're based in Mumbai and plugged into local dev/tech scenes",
        'You like building with APIs, JS, tools, and frameworks',
        'You enjoy explaining tech in fun, clear, creative ways',
      ],
      compensation: null,
      postingDate: null,
      closingDate: null,
      jobDescription: [
        'Role Overview',
        'Are you a tech-savvy storyteller who loves APIs, agents, and JavaScript?',
        'Do you enjoy building small projects, hosting dev meetups, and vibing with the developer community?',
        "We're looking for a Tech Marketing Intern to help grow our B2B developer platform.",
        '',
        'Key Responsibilities',
        '- Build small code demos & integrations using JavaScript, APIs, and agent frameworks',
        '- Organize or co-host local dev meetups, hack nights, and community events',
        '- Create engaging content \u2013 from short videos to technical blog posts and memes',
        '',
        'Must-Have Skills',
        "- You're based in Mumbai and plugged into local dev/tech scenes",
        '- You like building with APIs, JS, tools, and frameworks',
        '- You enjoy explaining tech in fun, clear, creative ways',
        '',
        'Why join us?',
        '- Be part of an innovative SaaS company shaping the Low-Code/No-Code industry.',
        '- Bonus points for personal websites, GitHub, or dev-related socials.',
      ].join('\n'),
      companyCareerPage: 'https://www.dronahq.com/careers/',
      companyDomain: 'dronahq.com',
      atsPlatform: 'official-company-careers',
    },
  )
})

test('Deltecs run validates the first-party DronaHQ homepage, careers page, and job detail pages', async () => {
  const deltecs = await loadDeltecsModule()
  const requestedUrls = []

  const jobs = await deltecs.createDeltecsScraper({
    maxJobs: 2,
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === deltecs.HOMEPAGE_URL) return homepageHtml
      if (url === deltecs.CAREERS_URL) return careersHtml
      if (url === 'https://www.dronahq.com/career/b2b-tech-marketing-intern-developer-platform/') {
        return marketingInternDetailHtml
      }
      if (url === 'https://www.dronahq.com/career/qa-lead/') {
        return qaLeadDetailHtml
      }

      throw new Error(`Unexpected Deltecs URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    deltecs.HOMEPAGE_URL,
    deltecs.CAREERS_URL,
    'https://www.dronahq.com/career/b2b-tech-marketing-intern-developer-platform/',
    'https://www.dronahq.com/career/qa-lead/',
  ])

  assert.deepEqual(
    jobs.map((job) => job.title),
    [
      'B2B Tech Marketing Intern (Developer Platform)',
      'QA Lead \u2013 SaaS (Low-Code/No-Code)',
    ],
  )

  const marketingRole = jobs.find((job) => job.jobId === 'deltecs-b2b-tech-marketing-intern-developer-platform')
  const qaRole = jobs.find((job) => job.jobId === 'deltecs-qa-lead')

  assert.deepEqual(marketingRole, {
    title: 'B2B Tech Marketing Intern (Developer Platform)',
    company: 'Deltecs',
    department: null,
    location: 'Mumbai, Maharashtra, India',
    city: 'Mumbai',
    country: 'India',
    jobId: 'deltecs-b2b-tech-marketing-intern-developer-platform',
    requisitionId: 'deltecs-b2b-tech-marketing-intern-developer-platform',
    sourceUrl: 'https://www.dronahq.com/career/b2b-tech-marketing-intern-developer-platform/',
    applyUrl: 'https://www.dronahq.com/career/b2b-tech-marketing-intern-developer-platform/',
    employmentType: 'Full-time',
    workplaceType: 'Hybrid',
    experienceRequired: 'Fresher',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Build small code demos & integrations using JavaScript, APIs, and agent frameworks',
      'Organize or co-host local dev meetups, hack nights, and community events',
      'Create engaging content \u2013 from short videos to technical blog posts and memes',
      "You're based in Mumbai and plugged into local dev/tech scenes",
      'You like building with APIs, JS, tools, and frameworks',
      'You enjoy explaining tech in fun, clear, creative ways',
    ],
    compensation: null,
    postingDate: null,
    closingDate: null,
    jobDescription: [
      'Role Overview',
      'Are you a tech-savvy storyteller who loves APIs, agents, and JavaScript?',
      'Do you enjoy building small projects, hosting dev meetups, and vibing with the developer community?',
      "We're looking for a Tech Marketing Intern to help grow our B2B developer platform.",
      '',
      'Key Responsibilities',
      '- Build small code demos & integrations using JavaScript, APIs, and agent frameworks',
      '- Organize or co-host local dev meetups, hack nights, and community events',
      '- Create engaging content \u2013 from short videos to technical blog posts and memes',
      '',
      'Must-Have Skills',
      "- You're based in Mumbai and plugged into local dev/tech scenes",
      '- You like building with APIs, JS, tools, and frameworks',
      '- You enjoy explaining tech in fun, clear, creative ways',
      '',
      'Why join us?',
      '- Be part of an innovative SaaS company shaping the Low-Code/No-Code industry.',
      '- Bonus points for personal websites, GitHub, or dev-related socials.',
    ].join('\n'),
    companyCareerPage: 'https://www.dronahq.com/careers/',
    companyDomain: 'dronahq.com',
    atsPlatform: 'official-company-careers',
    source: 'deltecs',
    link: 'https://www.dronahq.com/career/b2b-tech-marketing-intern-developer-platform/',
    scrapedAt: FIXED_SCRAPED_AT,
  })

  assert.equal(qaRole?.company, 'Deltecs')
  assert.equal(qaRole?.location, 'Mumbai, Maharashtra, India')
  assert.equal(qaRole?.city, 'Mumbai')
  assert.equal(qaRole?.country, 'India')
  assert.equal(qaRole?.employmentType, 'Full-time')
  assert.equal(qaRole?.workplaceType, 'Hybrid')
  assert.equal(qaRole?.experienceRequired, '5+Years')
  assert.equal(qaRole?.applyUrl, 'https://www.dronahq.com/career/qa-lead/')
  assert.equal(qaRole?.source, 'deltecs')
  assert.equal(qaRole?.scrapedAt, FIXED_SCRAPED_AT)
  assert.match(qaRole?.jobDescription ?? '', /Why join us\?/i)
  assert.match(qaRole?.jobDescription ?? '', /ISTQB, Six Sigma, Agile\/DevOps certifications are a plus\./i)
})

test('Deltecs fails closed when the verified homepage, careers page, or job detail surface drifts', async () => {
  const deltecs = await loadDeltecsModule()

  await assert.rejects(
    deltecs.createDeltecsScraper().run({
      fetchText: async (url) => {
        if (url === deltecs.HOMEPAGE_URL) {
          return '<html><head><title>Unexpected</title></head><body>Broken</body></html>'
        }

        throw new Error(`Unexpected Deltecs URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    deltecs.createDeltecsScraper().run({
      fetchText: async (url) => {
        if (url === deltecs.HOMEPAGE_URL) return homepageHtml
        if (url === deltecs.CAREERS_URL) {
          return careersHtml.replace('Open Positions at DronaHQ', 'Meet the Team')
        }

        throw new Error(`Unexpected Deltecs URL: ${url}`)
      },
    }),
    /verified careers page/i,
  )

  await assert.rejects(
    deltecs.createDeltecsScraper({ maxJobs: 1 }).run({
      fetchText: async (url) => {
        if (url === deltecs.HOMEPAGE_URL) return homepageHtml
        if (url === deltecs.CAREERS_URL) return careersHtml
        if (url === 'https://www.dronahq.com/career/b2b-tech-marketing-intern-developer-platform/') {
          return marketingInternDetailHtml.replace('Must-Have Skills', 'Core Strengths')
        }

        throw new Error(`Unexpected Deltecs URL: ${url}`)
      },
    }),
    /verified job detail/i,
  )
})
