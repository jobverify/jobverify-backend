import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'scraper-support',
  'tests',
  'fixtures',
  'qualigytech',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const homepageHtml = readFixture('homepage.html')
const careersHtml = readFixture('careers.html')
const jobsHtml = readFixture('jobs.html')
const systemsSupportEngineerHtml = readFixture('systems-support-engineer.html')
const leadDevopsEngineerHtml = readFixture('lead-devops-engineer.html')
const jobsHtmlWithoutCanonical = jobsHtml
  .replace('    <link rel="canonical" href="https://www.qualigytech.com/jobs/" />\n', '')
  .replace('<title>Job Archives | QualigyTech</title>', '<title>Jobs | QualigyTech</title>\n    <link rel="alternate" type="application/rss+xml" title="QualigyTech » Jobs Feed" href="https://www.qualigytech.com/jobs/feed/" />')

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Qualigy Tech scraper module at ./script.js')
  }
}

test('Qualigy Tech sentinels recognize the verified homepage, careers page, and first-party jobs archive', async () => {
  const qualigy = await loadModule()

  assert.equal(qualigy.SOURCE, 'qualigytech')
  assert.equal(qualigy.COMPANY, 'Qualigy Tech')
  assert.equal(qualigy.HOMEPAGE_URL, 'https://www.qualigytech.com/')
  assert.equal(qualigy.CAREERS_URL, 'https://www.qualigytech.com/careers/')
  assert.equal(qualigy.JOBS_URL, 'https://www.qualigytech.com/jobs/')
  assert.equal(qualigy.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(qualigy.hasOfficialCareersPageSignal(careersHtml), true)
  assert.equal(qualigy.hasOfficialJobsArchiveSignal(jobsHtml), true)
})

test('Qualigy Tech extracts the current first-party jobs archive cards', async () => {
  const qualigy = await loadModule()

  assert.deepEqual(qualigy.extractArchiveListings(jobsHtml), [
    {
      title: 'Systems support Engineer',
      sourceUrl: 'https://www.qualigytech.com/jobs/systems-support-engineer/',
      location: 'Bangalore',
      excerpt:
        'Job location: Bangalore Responsibilities At least 4+ years hands-on experience in relevant industry experience Installation of operating systems like ubuntu/windows etc. Domain joining the system . c...',
    },
    {
      title: 'Lead DevOps Engineer',
      sourceUrl: 'https://www.qualigytech.com/jobs/lead-devops-engineer/',
      location: null,
      excerpt:
        'Responsibilities Atleast7+yearshands-onexperienceininfrastructureengineering,DevOps In-depth knowledge of CI/CD concepts andtooling. GoodunderstandingofdesignofnativeCloudapplications...',
    },
  ])
})

test('Qualigy Tech still recognizes the trusted jobs archive when WordPress omits the archive canonical tag', async () => {
  const qualigy = await loadModule()

  assert.equal(qualigy.hasOfficialJobsArchiveSignal(jobsHtmlWithoutCanonical), true)
  assert.equal(qualigy.extractArchiveListings(jobsHtmlWithoutCanonical).length, 2)
})

test('Qualigy Tech trusts same-domain detail pages with first-party apply forms and extracts job data', async () => {
  const qualigy = await loadModule()

  assert.equal(
    qualigy.hasOfficialJobDetailSignal(
      systemsSupportEngineerHtml,
      'https://www.qualigytech.com/jobs/systems-support-engineer/',
    ),
    true,
  )
  assert.equal(
    qualigy.hasOfficialJobDetailSignal(
      leadDevopsEngineerHtml,
      'https://www.qualigytech.com/jobs/lead-devops-engineer/',
    ),
    true,
  )

  const systemsSupport = qualigy.extractJobDetail(systemsSupportEngineerHtml, {
    title: 'Systems support Engineer',
    sourceUrl: 'https://www.qualigytech.com/jobs/systems-support-engineer/',
    location: 'Bangalore',
    excerpt:
      'Job location: Bangalore Responsibilities At least 4+ years hands-on experience in relevant industry experience Installation of operating systems like ubuntu/windows etc. Domain joining the system . c...',
  })

  assert.deepEqual(
    {
      title: systemsSupport.title,
      company: systemsSupport.company,
      location: systemsSupport.location,
      city: systemsSupport.city,
      state: systemsSupport.state,
      country: systemsSupport.country,
      jobId: systemsSupport.jobId,
      requisitionId: systemsSupport.requisitionId,
      sourceUrl: systemsSupport.sourceUrl,
      applyUrl: systemsSupport.applyUrl,
      employmentType: systemsSupport.employmentType,
      experienceRequired: systemsSupport.experienceRequired,
    },
    {
      title: 'Systems support Engineer',
      company: 'Qualigy Tech',
      location: 'Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      jobId: '3172',
      requisitionId: '3172',
      sourceUrl: 'https://www.qualigytech.com/jobs/systems-support-engineer/',
      applyUrl: 'https://www.qualigytech.com/jobs/systems-support-engineer/',
      employmentType: null,
      experienceRequired: 'At least 4+ years hands-on experience in relevant industry experience',
    },
  )
  assert.ok(
    systemsSupport.requiredSkills.includes('Installation of operating systems like ubuntu/windows etc.'),
  )
  assert.match(systemsSupport.jobDescription, /Responsibilities:/i)
  assert.match(systemsSupport.jobDescription, /Requirements:/i)

  const leadDevops = qualigy.extractJobDetail(leadDevopsEngineerHtml, {
    title: 'Lead DevOps Engineer',
    sourceUrl: 'https://www.qualigytech.com/jobs/lead-devops-engineer/',
    location: null,
    excerpt:
      'Responsibilities Atleast7+yearshands-onexperienceininfrastructureengineering,DevOps In-depth knowledge of CI/CD concepts andtooling. GoodunderstandingofdesignofnativeCloudapplications...',
  })

  assert.deepEqual(
    {
      title: leadDevops.title,
      company: leadDevops.company,
      location: leadDevops.location,
      city: leadDevops.city,
      state: leadDevops.state,
      country: leadDevops.country,
      jobId: leadDevops.jobId,
      requisitionId: leadDevops.requisitionId,
      sourceUrl: leadDevops.sourceUrl,
      applyUrl: leadDevops.applyUrl,
      employmentType: leadDevops.employmentType,
      experienceRequired: leadDevops.experienceRequired,
    },
    {
      title: 'Lead DevOps Engineer',
      company: 'Qualigy Tech',
      location: null,
      city: null,
      state: null,
      country: 'India',
      jobId: '3132',
      requisitionId: '3132',
      sourceUrl: 'https://www.qualigytech.com/jobs/lead-devops-engineer/',
      applyUrl: 'https://www.qualigytech.com/jobs/lead-devops-engineer/',
      employmentType: null,
      experienceRequired: 'Atleast7+yearshands-onexperienceininfrastructureengineering,DevOps',
    },
  )
  assert.ok(leadDevops.requiredSkills.includes('Must: AWS, git, Python, shell scripting, Linux, Terraform, Cloudformation, Jenkins'))
})

test('Qualigy Tech run verifies the trusted first-party surfaces and decorates current openings', async () => {
  const qualigy = await loadModule()
  const requestedUrls = []

  const jobs = await qualigy.createQualigyTechScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === qualigy.HOMEPAGE_URL) return homepageHtml
      if (url === qualigy.CAREERS_URL) return careersHtml
      if (url === qualigy.JOBS_URL) return jobsHtml
      if (url === 'https://www.qualigytech.com/jobs/systems-support-engineer/') {
        return systemsSupportEngineerHtml
      }
      if (url === 'https://www.qualigytech.com/jobs/lead-devops-engineer/') {
        return leadDevopsEngineerHtml
      }

      throw new Error(`Unexpected Qualigy Tech URL: ${url}`)
    },
    now: () => '2026-07-11T11:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    qualigy.HOMEPAGE_URL,
    qualigy.CAREERS_URL,
    qualigy.JOBS_URL,
    'https://www.qualigytech.com/jobs/systems-support-engineer/',
    'https://www.qualigytech.com/jobs/lead-devops-engineer/',
  ])

  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      source: job.source,
      company: job.company,
      link: job.link,
      companyDomain: job.companyDomain,
      atsPlatform: job.atsPlatform,
      scrapedAt: job.scrapedAt,
    })),
    [
      {
        title: 'Systems support Engineer',
        source: 'qualigytech',
        company: 'Qualigy Tech',
        link: 'https://www.qualigytech.com/jobs/systems-support-engineer/',
        companyDomain: 'qualigytech.com',
        atsPlatform: 'official-company-careers',
        scrapedAt: '2026-07-11T11:00:00.000Z',
      },
      {
        title: 'Lead DevOps Engineer',
        source: 'qualigytech',
        company: 'Qualigy Tech',
        link: 'https://www.qualigytech.com/jobs/lead-devops-engineer/',
        companyDomain: 'qualigytech.com',
        atsPlatform: 'official-company-careers',
        scrapedAt: '2026-07-11T11:00:00.000Z',
      },
    ],
  )
})

test('Qualigy Tech fails closed when the trusted jobs archive or detail apply form drifts', async () => {
  const qualigy = await loadModule()

  await assert.rejects(
    qualigy.createQualigyTechScraper().run({
      fetchText: async (url) => {
        if (url === qualigy.HOMEPAGE_URL) return homepageHtml
        if (url === qualigy.CAREERS_URL) return careersHtml
        if (url === qualigy.JOBS_URL) {
          return jobsHtml.replace('post-type-archive-jobpost', 'unexpected-archive')
        }

        throw new Error(`Unexpected Qualigy Tech URL: ${url}`)
      },
    }),
    /verified Qualigy Tech jobs archive/i,
  )

  await assert.rejects(
    qualigy.createQualigyTechScraper().run({
      fetchText: async (url) => {
        if (url === qualigy.HOMEPAGE_URL) return homepageHtml
        if (url === qualigy.CAREERS_URL) return careersHtml
        if (url === qualigy.JOBS_URL) return jobsHtml
        if (url === 'https://www.qualigytech.com/jobs/systems-support-engineer/') {
          return systemsSupportEngineerHtml.replace('Apply For This Job', 'Request Information')
        }
        if (url === 'https://www.qualigytech.com/jobs/lead-devops-engineer/') {
          return leadDevopsEngineerHtml
        }

        throw new Error(`Unexpected Qualigy Tech URL: ${url}`)
      },
    }),
    /verified Qualigy Tech job detail/i,
  )
})
