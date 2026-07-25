import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadBhagwatiProductsLimitedModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Bhagwati Products Limited scraper module at ./script.js')
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(currentDir, 'fixtures')

const homepageHtml = fs.readFileSync(path.join(fixturesDir, 'homepage.html'), 'utf8')
const careersHtml = fs.readFileSync(path.join(fixturesDir, 'careers.html'), 'utf8')
const jobsPortalHtml = fs.readFileSync(path.join(fixturesDir, 'jobs-portal.html'), 'utf8')
const detailPages = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, 'detail-pages.json'), 'utf8').replace(/^\uFEFF/, ''),
)
const applyPageHtml = fs.readFileSync(path.join(fixturesDir, 'apply-page.html'), 'utf8')

test('Bhagwati Products Limited scraper validates the verified homepage, careers handoff, jobs portal, detail pages, and apply form surface', async () => {
  const bhagwatiProductsLimited = await loadBhagwatiProductsLimitedModule()

  assert.equal(bhagwatiProductsLimited.SOURCE, 'bhagwatiproductslimited')
  assert.equal(bhagwatiProductsLimited.COMPANY, 'Bhagwati Products Limited')
  assert.equal(bhagwatiProductsLimited.HOMEPAGE_URL, 'https://www.bhagwatiproductsltd.com/')
  assert.equal(
    bhagwatiProductsLimited.CAREERS_URL,
    'https://www.bhagwatiproductsltd.com/careers.html',
  )
  assert.equal(bhagwatiProductsLimited.JOBS_PORTAL_URL, 'https://ess.bhagwati.co/rms')

  assert.equal(bhagwatiProductsLimited.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(
    bhagwatiProductsLimited.extractHomepageCareersUrl(homepageHtml),
    bhagwatiProductsLimited.CAREERS_URL,
  )
  assert.equal(bhagwatiProductsLimited.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(
    bhagwatiProductsLimited.extractJobsPortalUrl(careersHtml),
    bhagwatiProductsLimited.JOBS_PORTAL_URL,
  )
  assert.equal(bhagwatiProductsLimited.hasOfficialJobsPortalSignal(jobsPortalHtml), true)

  const jobCards = bhagwatiProductsLimited.extractJobCards(jobsPortalHtml)
  assert.equal(jobCards.length, 17)
  assert.deepEqual(jobCards[0], {
    detailId: '34',
    department: 'FATP Engineering',
    listingPosition: 'GET-TME',
    location: 'Greater Noida',
    employmentType: 'Full Time',
    postingDate: '2026-07-01',
    sourceUrl: 'https://ess.bhagwati.co/rms/Career/GetPostedJobbyID?id=34',
  })
  assert.deepEqual(jobCards.at(-1), {
    detailId: '50',
    department: 'SMT-Engineering',
    listingPosition: 'MT',
    location: 'Greater Noida',
    employmentType: 'Full Time',
    postingDate: '2026-07-07',
    sourceUrl: 'https://ess.bhagwati.co/rms/Career/GetPostedJobbyID?id=50',
  })

  assert.equal(
    bhagwatiProductsLimited.hasOfficialJobDetailSignal(detailPages['35']),
    true,
  )
  assert.deepEqual(
    bhagwatiProductsLimited.extractJobDetail(
      detailPages['35'],
      'https://ess.bhagwati.co/rms/Career/GetPostedJobbyID?id=35',
    ),
    {
      title: 'GET-TME',
      department: 'FATP Engineering',
      role: 'After Training you will be responsible for developing, implementing, and optimizing testing processes and equipment within the FATP operations. The role ensures high-quality test coverage, equipment uptime, and process efficiency while supporting new product introduction (NPI), mass production ramp-up, and continuous improvement initiatives. This position acts as a technical bridge between design, production, and quality teams to ensure defect-free and efficient mobile phone assembly and testing.',
      position: 'GET-TME',
      jobDescription:
        'Key Responsibilities • Develop and optimize test processes (ICT, FCT, functional & reliability testing) to ensure product quality. • Lead equipment setup, calibration, validation, and preventive maintenance to achieve high uptime and accuracy. • Collaborate with NPI teams during EVT, PVT, and MP phases to validate test coverage and resolve early defects. • Drive root cause analysis and corrective actions for test-related failures and yield issues. • Define and monitor test parameters, limits, and failure analysis procedures. • Prepare and maintain testing documentation, SOPs, and engineering change updates. • Work with global R&D and equipment vendors to transfer and localize new test solutions. • Support process automation, MES integration, and data analysis for real-time quality monitoring. Required Qualifications & Experience • Bachelor’s degree in Electronics, Electrical, Instrumentation, or related Engineering field.',
      kpi: 'Key Performance Indicators (KPIs) 1. First Pass Yield (FPY): % of units passing test stations without rework. 2. Test Equipment Uptime: % uptime of test stations against planned availability. 3. Cycle Time Efficiency: Variance between actual and target test cycle time. 4. Defect Detection Rate: % of defects detected at test vs. field/customer returns. 5. NPI Test Readiness: % of new models with validated test coverage before MP. 6. Cost Reduction Initiatives: Savings achieved through localization, automation, or process optimization. 7. Documentation Compliance: % adherence to SOPs, ECN updates, and audit requirements.',
      applyUrl: 'https://ess.bhagwati.co/rms/Career?VacancyId=GET_01',
      vacancyId: 'GET_01',
      sourceUrl: 'https://ess.bhagwati.co/rms/Career/GetPostedJobbyID?id=35',
    },
  )

  assert.equal(bhagwatiProductsLimited.hasOfficialApplyPageSignal(applyPageHtml), true)
})

test('Bhagwati Products Limited scraper returns first-party portal jobs end to end from the verified fixtures', async () => {
  const bhagwatiProductsLimited = await loadBhagwatiProductsLimitedModule()
  const requestedUrls = []

  const jobs = await bhagwatiProductsLimited.createBhagwatiProductsLimitedScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === bhagwatiProductsLimited.HOMEPAGE_URL) return homepageHtml
      if (url === bhagwatiProductsLimited.CAREERS_URL) return careersHtml
      if (url === bhagwatiProductsLimited.JOBS_PORTAL_URL) return jobsPortalHtml

      const detailId = url.match(/GetPostedJobbyID\?id=(\d+)/i)?.[1]
      if (detailId && detailPages[detailId]) {
        return detailPages[detailId]
      }

      if (/^https:\/\/ess\.bhagwati\.co\/rms\/Career\?VacancyId=/i.test(url)) {
        return applyPageHtml
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-11T00:00:00.000Z',
  })

  assert.equal(jobs.length, 17)
  assert.equal(requestedUrls.length, 37)
  assert.deepEqual(jobs[0], {
    title: 'GET-TME',
    company: 'Bhagwati Products Limited',
    source: 'bhagwatiproductslimited',
    country: 'India',
    location: 'Greater Noida',
    city: 'Greater Noida',
    department: 'FATP Engineering',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    employmentType: 'Full Time',
    jobDescription:
      'Department: FATP Engineering\n\nRole: After Training you will be responsible for developing, implementing, and optimizing testing processes and equipment within the FATP operations. The role ensures high-quality test coverage, equipment uptime, and process efficiency while supporting new product introduction (NPI), mass production ramp-up, and continuous improvement initiatives. This position acts as a technical bridge between design, production, and quality teams to ensure defect-free and efficient mobile phone assembly and testing.\n\nPosition: GET-TME\n\nJob Description: GET\n\nKPI: Key Performance Indicators (KPIs) 1. First Pass Yield (FPY): % of units passing test stations without rework. 2. Test Equipment Uptime: % uptime of test stations against planned availability. 3. Cycle Time Efficiency: Variance between actual and target test cycle time. 4. Defect Detection Rate: % of defects detected at test vs. field/customer returns. 5. NPI Test Readiness: % of new models with validated test coverage before MP. 6. Cost Reduction Initiatives: Savings achieved through localization, automation, or process optimization. 7. Documentation Compliance: % adherence to SOPs, ECN updates, and audit requirements.',
    sourceUrl: 'https://ess.bhagwati.co/rms/Career/GetPostedJobbyID?id=34',
    applyUrl: 'https://ess.bhagwati.co/rms/Career?VacancyId=01072026',
    jobId: 'bhagwatiproductslimited-01072026',
    requisitionId: '01072026',
    postingDate: '2026-07-01',
    closingDate: null,
    link: 'https://ess.bhagwati.co/rms/Career?VacancyId=01072026',
    scrapedAt: '2026-07-11T00:00:00.000Z',
  })
  assert.deepEqual(jobs.at(-1), {
    title: 'MT',
    company: 'Bhagwati Products Limited',
    source: 'bhagwatiproductslimited',
    country: 'India',
    location: 'Greater Noida',
    city: 'Greater Noida',
    department: 'SMT-Engineering',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    employmentType: 'Full Time',
    jobDescription:
      'Department: SMT-Engineering\n\nRole: To develop future manufacturing leaders by gaining practical exposure to SMT operations, production planning, quality, supply chain coordination, and continuous improvement. The Management Trainee will support daily manufacturing activities, analyze operational data, and participate in productivity and cost optimization projects.\n\nPosition: MT\n\nJob Description: Key Responsibilities Support daily production planning and schedule adherence. Monitor production KPIs (OEE, UPH, FPY, Scrap, Downtime). Prepare daily, weekly, and monthly MIS reports. Coordinate with Production, Planning, Quality, Warehouse, Maintenance, and Process Engineering teams. Track action plans for production and quality improvements. Participate in Lean Manufacturing, Kaizen, 5S, and cost reduction projects. Support manpower planning and productivity improvement. Assist in inventory control and material availability. Ensure compliance with SOPs, EHS, ESD, and company policies. Prepare management review presentations and performance dashboards. Required Skills Advanced MS Excel PowerPoint ERP/MES knowledge (preferred) Data analysis and reporting Communication and coordination Problem-solving and leadership potential\n\nKPI: Key Performance Indicators (KPIs) Production plan adherence Productivity improvement Cost reduction initiatives On-time MIS reporting Kaizen implementation Inventory accuracy',
    sourceUrl: 'https://ess.bhagwati.co/rms/Career/GetPostedJobbyID?id=50',
    applyUrl: 'https://ess.bhagwati.co/rms/Career?VacancyId=GET_16',
    jobId: 'bhagwatiproductslimited-get-16',
    requisitionId: 'GET_16',
    postingDate: '2026-07-07',
    closingDate: null,
    link: 'https://ess.bhagwati.co/rms/Career?VacancyId=GET_16',
    scrapedAt: '2026-07-11T00:00:00.000Z',
  })
})

test('Bhagwati Products Limited scraper fails closed when the verified public surfaces drift', async () => {
  const bhagwatiProductsLimited = await loadBhagwatiProductsLimitedModule()

  await assert.rejects(
    bhagwatiProductsLimited.createBhagwatiProductsLimitedScraper().run({
      fetchText: async (url) => {
        if (url === bhagwatiProductsLimited.HOMEPAGE_URL) {
          return '<html><body><h1>Placeholder</h1></body></html>'
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    bhagwatiProductsLimited.createBhagwatiProductsLimitedScraper().run({
      fetchText: async (url) => {
        if (url === bhagwatiProductsLimited.HOMEPAGE_URL) return homepageHtml
        if (url === bhagwatiProductsLimited.CAREERS_URL) {
          return careersHtml.replace(/https:\/\/ess\.bhagwati\.co\/rms/gi, 'https://example.com/jobs')
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /first-party jobs portal/i,
  )

  await assert.rejects(
    bhagwatiProductsLimited.createBhagwatiProductsLimitedScraper().run({
      fetchText: async (url) => {
        if (url === bhagwatiProductsLimited.HOMEPAGE_URL) return homepageHtml
        if (url === bhagwatiProductsLimited.CAREERS_URL) return careersHtml
        if (url === bhagwatiProductsLimited.JOBS_PORTAL_URL) {
          return jobsPortalHtml.replace(/openModal\(\d+\)/g, 'openModal()')
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /jobs portal changed|job cards found/i,
  )

  await assert.rejects(
    bhagwatiProductsLimited.createBhagwatiProductsLimitedScraper().run({
      fetchText: async (url) => {
        if (url === bhagwatiProductsLimited.HOMEPAGE_URL) return homepageHtml
        if (url === bhagwatiProductsLimited.CAREERS_URL) return careersHtml
        if (url === bhagwatiProductsLimited.JOBS_PORTAL_URL) return jobsPortalHtml
        if (url === 'https://ess.bhagwati.co/rms/Career/GetPostedJobbyID?id=34') {
          return detailPages['34'].replace('Apply Now', 'Learn More')
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /job detail surface changed|apply surface/i,
  )
})
