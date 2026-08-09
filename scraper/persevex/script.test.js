import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  COMPANY,
  HOMEPAGE_URL,
  SOURCE,
  createPersevexScraper,
  extractPublicJobs,
  hasOfficialCareersSignal,
  hasOfficialHomepageSignal,
  hasVerifiedCareersLink,
} from './script.js'

const homepageHtml = `
  <html>
    <head>
      <title>Persevex | Persevex</title>
      <meta property="og:title" content="Persevex | Empowering Careers" />
    </head>
    <body>
      <nav>
        <a href="/campus-ambassador">Campus Ambassador</a>
        <a href="/support">Support</a>
        <a href="/reviews">Reviews</a>
        <a href="/careers">Careers</a>
        <a href="https://main.drp8r2gpa3lj1.amplifyapp.com">Job Clox</a>
      </nav>
      <button>Persevex LMS</button>
    </body>
  </html>
`

const careersHtml = `
  <html>
    <head>
      <title>Persevex | Persevex</title>
      <meta property="og:title" content="Persevex | Empowering Careers" />
    </head>
    <body>
      <section>
        <span>Join the Team</span>
        <h1>Help students <span>launch careers</span>. Build yours here.</h1>
        <a href="#open-roles">See open roles</a>
      </section>

      <section class="section-padding bg-slate-50 dark:bg-card" id="open-roles">
        <div class="text-center mb-12">
          <span>Now Hiring</span>
          <h2>Open <span class="text-primary">Positions</span></h2>
          <p>Filter by department, work type, and location. Apply in under a minute.</p>
        </div>

        <p>Showing <span class="font-semibold text-foreground">6</span> roles</p>

        <div class="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <button class="w-full text-left px-6 py-5 flex items-start justify-between gap-4 cursor-pointer">
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full border">Full-time</span>
                <span class="text-xs text-muted-foreground font-medium bg-secondary px-2.5 py-0.5 rounded-full border border-border">Business Development</span>
              </div>
              <h3 class="text-lg font-bold text-foreground">Business Development Executive</h3>
              <div class="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span><svg></svg> Hybrid (Bangalore / India)</span>
                <span><svg></svg> Full-time</span>
              </div>
            </div>
          </button>
        </div>

        <div class="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <button class="w-full text-left px-6 py-5 flex items-start justify-between gap-4 cursor-pointer">
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full border">Full-time</span>
                <span class="text-xs text-muted-foreground font-medium bg-secondary px-2.5 py-0.5 rounded-full border border-border">Careers</span>
              </div>
              <h3 class="text-lg font-bold text-foreground">Placement Executive</h3>
              <div class="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span><svg></svg> Hybrid (Pune / Remote)</span>
                <span><svg></svg> Full-time</span>
              </div>
            </div>
          </button>
        </div>

        <div class="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <button class="w-full text-left px-6 py-5 flex items-start justify-between gap-4 cursor-pointer">
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full border">Full-time</span>
                <span class="text-xs text-muted-foreground font-medium bg-secondary px-2.5 py-0.5 rounded-full border border-border">Education</span>
              </div>
              <h3 class="text-lg font-bold text-foreground">Curriculum Content Lead</h3>
              <div class="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span><svg></svg> Remote (India)</span>
                <span><svg></svg> Full-time</span>
              </div>
            </div>
          </button>
        </div>

        <div class="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <button class="w-full text-left px-6 py-5 flex items-start justify-between gap-4 cursor-pointer">
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full border">Full-time</span>
                <span class="text-xs text-muted-foreground font-medium bg-secondary px-2.5 py-0.5 rounded-full border border-border">Engineering</span>
              </div>
              <h3 class="text-lg font-bold text-foreground">Frontend Developer</h3>
              <div class="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span><svg></svg> Remote (India)</span>
                <span><svg></svg> Full-time</span>
              </div>
            </div>
          </button>
        </div>

        <div class="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <button class="w-full text-left px-6 py-5 flex items-start justify-between gap-4 cursor-pointer">
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full border">Full-time</span>
                <span class="text-xs text-muted-foreground font-medium bg-secondary px-2.5 py-0.5 rounded-full border border-border">Human Resources</span>
              </div>
              <h3 class="text-lg font-bold text-foreground">Human Resource Executive</h3>
              <div class="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span><svg></svg> Hybrid (Bangalore / Remote)</span>
                <span><svg></svg> Full-time</span>
              </div>
            </div>
          </button>
        </div>

        <div class="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <button class="w-full text-left px-6 py-5 flex items-start justify-between gap-4 cursor-pointer">
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full border">Internship</span>
                <span class="text-xs text-muted-foreground font-medium bg-secondary px-2.5 py-0.5 rounded-full border border-border">Marketing</span>
              </div>
              <h3 class="text-lg font-bold text-foreground">Social Media &amp; Marketing Intern</h3>
              <div class="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span><svg></svg> Remote</span>
                <span><svg></svg> Internship</span>
                <span>💰 ₹15,000</span>
              </div>
            </div>
          </button>
        </div>

        <div>
          <p>Don&#x27;t see your role?</p>
          <button>Apply Now</button>
        </div>
      </section>
    </body>
  </html>
`

test('Persevex scraper recognizes the verified homepage and careers surface', () => {
  assert.equal(SOURCE, 'persevex')
  assert.equal(COMPANY, 'Persevex')
  assert.equal(HOMEPAGE_URL, 'https://www.persevex.com/')
  assert.equal(CAREERS_URL, 'https://www.persevex.com/careers')
  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hasVerifiedCareersLink(homepageHtml), true)
  assert.equal(hasOfficialCareersSignal(careersHtml), true)
})

test('Persevex scraper extracts the current public role cards from the first-party careers page', () => {
  const jobs = extractPublicJobs(careersHtml)

  assert.equal(jobs.length, 6)
  assert.deepEqual(jobs[0], {
    title: 'Business Development Executive',
    company: 'Persevex',
    department: 'Business Development',
    location: 'Hybrid (Bangalore / India)',
    city: 'Bangalore',
    state: null,
    country: 'India',
    jobId: 'persevex-business-development-executive-business-development-hybrid-bangalore-india',
    requisitionId: 'persevex-business-development-executive-business-development-hybrid-bangalore-india',
    sourceUrl: 'https://www.persevex.com/careers',
    applyUrl: 'https://www.persevex.com/careers',
    employmentType: 'Full-time',
    workplaceType: 'Hybrid',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Official Persevex opening listed on the first-party careers page. Department: Business Development. Location: Hybrid (Bangalore / India). Work type: Full-time.',
    publicExperienceChecked: true,
    remoteStatus: 'Hybrid',
  })

  assert.deepEqual(jobs[5], {
    title: 'Social Media & Marketing Intern',
    company: 'Persevex',
    department: 'Marketing',
    location: 'Remote (India)',
    city: null,
    state: null,
    country: 'India',
    jobId: 'persevex-social-media-marketing-intern-marketing-remote-india',
    requisitionId: 'persevex-social-media-marketing-intern-marketing-remote-india',
    sourceUrl: 'https://www.persevex.com/careers',
    applyUrl: 'https://www.persevex.com/careers',
    employmentType: 'Internship',
    workplaceType: 'Remote',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Official Persevex opening listed on the first-party careers page. Department: Marketing. Location: Remote (India). Work type: Internship. Compensation: ₹15,000.',
    publicExperienceChecked: true,
    remoteStatus: 'Remote',
  })
})

test('Persevex scraper runs end to end and fails closed on homepage or role-card drift', async () => {
  const requestedUrls = []

  const jobs = await createPersevexScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === HOMEPAGE_URL) return homepageHtml
      if (url === CAREERS_URL) return careersHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 6)
  assert.deepEqual(requestedUrls, [HOMEPAGE_URL, CAREERS_URL])
  assert.equal(jobs[0].source, 'persevex')
  assert.equal(jobs[0].link, 'https://www.persevex.com/careers')
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)

  await assert.rejects(
    createPersevexScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) {
          return '<html><body><h1>Placeholder</h1></body></html>'
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /homepage/i,
  )

  await assert.rejects(
    createPersevexScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return homepageHtml
        if (url === CAREERS_URL) {
          return `
            <html>
              <head><title>Persevex | Persevex</title></head>
              <body>
                <section>
                  <span>Join the Team</span>
                  <h1>Help students <span>launch careers</span>. Build yours here.</h1>
                </section>
                <section id="open-roles">
                  <h2>Open <span class="text-primary">Positions</span></h2>
                  <p>Filter by department, work type, and location. Apply in under a minute.</p>
                  <p>Showing <span class="font-semibold text-foreground">6</span> roles</p>
                  <p>Don&#x27;t see your role?</p>
                </section>
              </body>
            </html>
          `
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /role cards/i,
  )
})
