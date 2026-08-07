import assert from 'node:assert/strict'
import test from 'node:test'

const loadAlgoUniversityModule = async () => {
  try {
    return await import('../../scraper/algouniversity/script.js')
  } catch {
    return null
  }
}

const buildCareersHtml = ({
  jsonLdJobs,
  cards,
}) => `
<!doctype html>
<html>
  <head>
    <script type="application/ld+json">${JSON.stringify(jsonLdJobs)}</script>
  </head>
  <body>
    <section id="openings" class="career-openings">
      <div id="job-list">
        ${cards.map((card) => `
          <div class="job-card" data-department="${card.department}">
            <div class="job-card__header">
              <div style="flex: 1;">
                <h3 class="job-card__title">${card.title}</h3>
                <div class="job-card__tags">
                  <span class="job-card__tag tag-${card.department}">${card.department}</span>
                  <span class="job-card__tag" style="background: #f3f4f6; color: #6b7280;">${card.locationTag}</span>
                  <span class="job-card__tag" style="background: #f3f4f6; color: #6b7280;">${card.employmentTag}</span>
                </div>
                <p class="job-card__desc">${card.summary}</p>
              </div>
              <a href="${card.href}" class="job-card__apply">Apply</a>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  </body>
</html>
`

test('extractSearchResults maps AlgoUniversity visible job cards plus JSON-LD metadata into shared scraper fields', async () => {
  const algoUniversity = await loadAlgoUniversityModule()
  assert.ok(algoUniversity)

  const careersHtml = buildCareersHtml({
    jsonLdJobs: [
      {
        '@context': 'https://schema.org/',
        '@type': 'JobPosting',
        title: "CEO's Office (Intern)",
        description: 'Work directly with the founder on creative marketing campaigns and founder office priorities.',
        datePosted: '2026-03-17',
        employmentType: 'Internship',
        hiringOrganization: {
          '@type': 'Organization',
          name: 'AlgoUniversity',
        },
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Remote',
            addressCountry: 'IN',
          },
        },
      },
      {
        '@context': 'https://schema.org/',
        '@type': 'JobPosting',
        title: 'Software Developer / Software Engineer',
        description: 'Build products across the stack for the next generation of technical learners.',
        datePosted: '2026-03-17',
        employmentType: 'Full Time',
        hiringOrganization: {
          '@type': 'Organization',
          name: 'AlgoUniversity',
        },
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Bengaluru',
            addressCountry: 'IN',
          },
        },
      },
    ],
    cards: [
      {
        title: "CEO's Office (Intern)",
        department: 'operations',
        locationTag: 'Remote',
        employmentTag: 'Internship',
        summary: 'Work directly with the founder on creative marketing campaigns...',
        href: '?role=1#apply-section',
      },
      {
        title: 'Software Developer / Software Engineer',
        department: 'engineering',
        locationTag: 'Bengaluru',
        employmentTag: 'Full Time',
        summary: "We're looking for passionate engineers, period...",
        href: '?role=2#apply-section',
      },
    ],
  })

  const jobs = algoUniversity.extractSearchResults(careersHtml)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: "CEO's Office (Intern)",
    company: 'AlgoUniversity',
    department: 'operations',
    location: 'Remote, India',
    city: null,
    country: 'India',
    jobId: '1',
    requisitionId: '1',
    sourceUrl: 'https://www.algouniversity.com/careers/?role=1#apply-section',
    applyUrl: 'https://www.algouniversity.com/careers/?role=1#apply-section',
    employmentType: 'Internship',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-03-17T00:00:00.000Z',
    closingDate: null,
    jobDescription: 'Work directly with the founder on creative marketing campaigns and founder office priorities.',
    publicExperienceChecked: true,
    remoteStatus: 'Remote',
  })
  assert.equal(jobs[1].title, 'Software Developer / Software Engineer')
  assert.equal(jobs[1].department, 'engineering')
  assert.equal(jobs[1].city, 'Bengaluru')
  assert.equal(jobs[1].remoteStatus, 'On-site')
  assert.equal(jobs[1].jobId, '2')
})

test('run fetches the AlgoUniversity careers page and decorates jobs', async () => {
  const algoUniversity = await loadAlgoUniversityModule()
  assert.ok(algoUniversity)

  const careersHtml = buildCareersHtml({
    jsonLdJobs: [
      {
        '@context': 'https://schema.org/',
        '@type': 'JobPosting',
        title: 'Teaching Mentor',
        description: 'Take live classes for DSA learners and improve program outcomes.',
        datePosted: '2026-03-17',
        employmentType: 'Full Time',
        hiringOrganization: {
          '@type': 'Organization',
          name: 'AlgoUniversity',
        },
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Remote',
            addressCountry: 'IN',
          },
        },
      },
    ],
    cards: [
      {
        title: 'Teaching Mentor',
        department: 'teaching',
        locationTag: 'Remote',
        employmentTag: 'Full Time',
        summary: 'Responsible for taking online classes for DSA learners...',
        href: '?role=3#apply-section',
      },
    ],
  })

  const requestedUrls = []
  const scraper = algoUniversity.createAlgoUniversityScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === algoUniversity.CAREER_PAGE_URL) return careersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.equal(algoUniversity.buildSearchUrl(), algoUniversity.CAREER_PAGE_URL)
  assert.deepEqual(requestedUrls, [algoUniversity.CAREER_PAGE_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'algouniversity')
  assert.equal(jobs[0].link, 'https://www.algouniversity.com/careers/?role=3#apply-section')
  assert.equal(jobs[0].company, 'AlgoUniversity')
  assert.equal(jobs[0].publicExperienceChecked, true)
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
