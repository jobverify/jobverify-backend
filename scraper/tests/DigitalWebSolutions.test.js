import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../digitalwebsolutions/script.js')

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Digital Web Solutions</title>
  </head>
  <body>
    <h1>Come join us and work with the best.</h1>
    <a href="https://hirenext.io/co/digital-web-solutions/" target="_self">View All Jobs</a>
  </body>
</html>
`

const boardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs at Digital Web Solutions</title>
  </head>
  <body>
    <a class="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group" href="/co/digital-web-solutions/trainee-recruitment-specialist/464">
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-gray-900 group-hover:text-[#22c55e] transition-colors">Trainee Recruitment Specialist</h3>
        <div class="flex flex-wrap gap-3 mt-1.5 text-sm text-gray-500">
          <span class="flex items-center gap-1"><svg></svg>Gurgaon</span>
          <span class="flex items-center gap-1"><svg></svg>0-2 Years</span>
          <span class="flex items-center gap-1"><svg></svg>Full Time</span>
        </div>
      </div>
    </a>
    <a class="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group" href="/co/digital-web-solutions/business-development-trainee-india/462">
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-gray-900 group-hover:text-[#22c55e] transition-colors">Business Development Trainee- India</h3>
        <div class="flex flex-wrap gap-3 mt-1.5 text-sm text-gray-500">
          <span class="flex items-center gap-1"><svg></svg>Hybrid</span>
          <span class="flex items-center gap-1"><svg></svg>0 Years</span>
          <span class="flex items-center gap-1"><svg></svg>Full Time</span>
        </div>
      </div>
    </a>
  </body>
</html>
`

const traineeDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Digital Web Solutions - Trainee Recruitment Specialist</title>
  </head>
  <body>
    <div class="prose">
      <h2>Job Description</h2>
      <div>Digital Web Solutions is seeking enthusiastic and tech-savvy freshers.</div>
    </div>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "Trainee Recruitment Specialist",
        "description": "Digital Web Solutions is seeking enthusiastic and tech-savvy freshers.",
        "employmentType": "Full Time",
        "jobLocation": {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Gurgaon",
            "addressCountry": "IN"
          }
        },
        "experienceRequirements": {
          "@type": "OccupationalExperienceRequirements",
          "monthsOfExperience": 0
        },
        "skills": ["Communication Skills", "Tech Savvy"],
        "responsibilities": "Learn and implement modern recruitment strategies using AI tools."
      }
    </script>
  </body>
</html>
`

const bdtDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Digital Web Solutions - Business Development Trainee- India</title>
  </head>
  <body>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "Business Development Trainee- India",
        "description": "Support the business development team and learn client outreach workflows.",
        "employmentType": "Full Time",
        "jobLocationType": "TELECOMMUTE",
        "skills": ["Communication", "CRM"],
        "responsibilities": "Support lead generation and pipeline hygiene."
      }
    </script>
  </body>
</html>
`

const loadCatalogModule = async () => {
  try {
    return await import('../digitalwebsolutions/catalog.js')
  } catch {
    assert.fail('Expected Digital Web Solutions catalog module at ../digitalwebsolutions/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../digitalwebsolutions/script.js')
  } catch {
    assert.fail('Expected Digital Web Solutions scraper module at ../digitalwebsolutions/script.js')
  }
}

test('Digital Web Solutions local catalog captures the verified first-party careers handoff', async () => {
  const { DIGITAL_WEB_SOLUTIONS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(DIGITAL_WEB_SOLUTIONS_CATALOG)

  assert.equal(defaultCatalog, DIGITAL_WEB_SOLUTIONS_CATALOG)
  assert.equal(provider.source, 'digitalwebsolutions')
  assert.equal(provider.companyName, 'Digital Web Solutions')
  assert.equal(provider.officialBrandName, 'Digital Web Solutions')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.digitalwebsolutions.com/')
  assert.equal(provider.companyCareerPage, 'https://www.digitalwebsolutions.com/careers/')
  assert.equal(provider.officialJobsBoardUrl, 'https://hirenext.io/co/digital-web-solutions/')
  assert.equal(provider.companyDomain, 'digitalwebsolutions.com')
  assert.equal(provider.atsPlatform, 'hirenext')
  assert.equal(provider.countryFilter, 'Global')
  assert.equal(provider.paginationStrategy, 'single-hirenext-company-board')
  assert.equal(provider.extractionStrategy, 'verified-first-party-careers-page+official-hirenext-board+detail-pages')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.verifiedPublicJobCount, 19)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Trainee Recruitment Specialist/i)
  assert.match(provider.verifiedSurfaceSummary, /AI & Content Associate/i)
})

test('Digital Web Solutions exact backlog row resolves from the local catalog', async () => {
  const { DIGITAL_WEB_SOLUTIONS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Digital Web Solutions\n',
    catalog: [hydrateProviderCatalogEntry(DIGITAL_WEB_SOLUTIONS_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('Digital Web Solutions scraper extracts jobs from the official Hirenext board and detail pages', async () => {
  const dws = await loadScriptModule()
  const jobs = await dws.run({
    fetchText: async (url) => {
      if (url === dws.CAREERS_URL) return careersHtml
      if (url === dws.JOBS_BOARD_URL) return boardHtml
      if (url === 'https://hirenext.io/co/digital-web-solutions/trainee-recruitment-specialist/464') {
        return traineeDetailHtml
      }
      if (url === 'https://hirenext.io/co/digital-web-solutions/business-development-trainee-india/462') {
        return bdtDetailHtml
      }

      assert.fail(`Unexpected fetchText URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map(({ title, location, employmentType, sourceUrl, applyUrl, country, remoteStatus }) => ({
      title,
      location,
      employmentType,
      sourceUrl,
      applyUrl,
      country,
      remoteStatus,
    })),
    [
      {
        title: 'Trainee Recruitment Specialist',
        location: 'Gurgaon',
        employmentType: 'Full Time',
        sourceUrl: 'https://hirenext.io/co/digital-web-solutions/trainee-recruitment-specialist/464',
        applyUrl: 'https://hirenext.io/co/digital-web-solutions/trainee-recruitment-specialist/464',
        country: 'India',
        remoteStatus: 'On-site',
      },
      {
        title: 'Business Development Trainee- India',
        location: 'Hybrid',
        employmentType: 'Full Time',
        sourceUrl: 'https://hirenext.io/co/digital-web-solutions/business-development-trainee-india/462',
        applyUrl: 'https://hirenext.io/co/digital-web-solutions/business-development-trainee-india/462',
        country: 'India',
        remoteStatus: 'Hybrid',
      },
    ],
  )
  assert.deepEqual(jobs[0].requiredSkills, ['Communication Skills', 'Tech Savvy'])
  assert.match(jobs[0].jobDescription, /tech-savvy freshers/i)
})

test('Digital Web Solutions scraper fails closed when the first-party careers handoff disappears', async () => {
  const dws = await loadScriptModule()

  await assert.rejects(
    dws.run({
      fetchText: async () => '<html><head><title>Careers - Digital Web Solutions</title></head><body>No board link</body></html>',
    }),
    /verified first-party careers page/i,
  )
})
