import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../emidstechnologieslimited/script.js')

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Emids</title>
  </head>
  <body>
    <a href="https://fa-eupt-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs" target="_blank">
      Explore Open Roles
    </a>
  </body>
</html>
`

const candidateExperienceHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Emids Career Site</title>
    <base href="/hcmUI/CandidateExperience/en/sites/CX_1/" data-apibaseurl="https://fa-eupt-saasfaprod1.fa.ocs.oraclecloud.com:443" data-sitenumber="CX_1" />
  </head>
  <body>
    Emids Career Site
  </body>
</html>
`

const listingPayload = {
  items: [
    {
      TotalJobsCount: 1,
      Limit: 5,
      requisitionList: [
        {
          Id: 'REQ-1001',
          Title: 'Business Analyst',
          JobFunction: 'Consulting',
          PrimaryLocation: 'Bengaluru, Karnataka, India',
          PrimaryLocationCountry: 'IN',
          secondaryLocations: [],
          ExternalPostedStartDate: '2026-07-10T00:00:00Z',
          ExternalPostedEndDate: null,
          ShortDescriptionStr: 'Partner with delivery teams and business stakeholders.',
          RequisitionType: 'Regular',
        },
      ],
    },
  ],
}

const detailPayload = {
  items: [
    {
      Id: 'REQ-1001',
      Title: 'Business Analyst',
      JobFunction: 'Consulting',
      PrimaryLocation: 'Bengaluru, Karnataka, India',
      PrimaryLocationCountry: 'IN',
      secondaryLocations: [],
      ExternalPostedStartDate: '2026-07-10T00:00:00Z',
      ExternalPostedEndDate: null,
      ExternalDescriptionStr: '<p>Gather requirements and partner with delivery teams.</p>',
      ExternalResponsibilitiesStr: '<p>Work with stakeholders and delivery leads.</p>',
      ExternalQualificationsStr: '<p>Bachelor degree and prior BA experience.</p>',
      RequisitionType: 'Regular',
    },
  ],
}

const loadCatalogModule = async () => {
  try {
    return await import('../emidstechnologieslimited/catalog.js')
  } catch {
    assert.fail('Expected Emids Technologies Limited catalog module at ../emidstechnologieslimited/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../emidstechnologieslimited/script.js')
  } catch {
    assert.fail('Expected Emids Technologies Limited scraper module at ../emidstechnologieslimited/script.js')
  }
}

test('Emids Technologies Limited local catalog captures the verified Oracle Cloud handoff', async () => {
  const { EMIDS_TECHNOLOGIES_LIMITED_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(EMIDS_TECHNOLOGIES_LIMITED_CATALOG)

  assert.equal(defaultCatalog, EMIDS_TECHNOLOGIES_LIMITED_CATALOG)
  assert.equal(provider.source, 'emidstechnologieslimited')
  assert.equal(provider.companyName, 'Emids Technologies Limited')
  assert.equal(provider.officialBrandName, 'Emids')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.emids.com/')
  assert.equal(provider.companyCareerPage, 'https://www.emids.com/careers/')
  assert.equal(
    provider.oracleCandidateExperienceUrl,
    'https://fa-eupt-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs',
  )
  assert.equal(provider.workspaceDomain, 'fa-eupt-saasfaprod1.fa.ocs.oraclecloud.com')
  assert.equal(
    provider.listingApiBaseUrl,
    'https://fa-eupt-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions',
  )
  assert.equal(
    provider.detailApiBaseUrl,
    'https://fa-eupt-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails',
  )
  assert.equal(
    provider.publicJobsBaseUrl,
    'https://fa-eupt-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/',
  )
  assert.equal(provider.siteNumber, 'CX_1')
  assert.equal(provider.companyDomain, 'emids.com')
  assert.equal(provider.atsPlatform, 'oracle-cloud')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'offset-query')
  assert.equal(provider.extractionStrategy, 'verified-first-party-careers-page+oracle-cloud-finder-api+oracle-cloud-detail-api')
  assert.equal(provider.verifiedPublicJobCount, 6)
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Explore Open Roles/i)
  assert.match(provider.verifiedSurfaceSummary, /Business Analyst/i)
  assert.match(provider.verifiedSurfaceSummary, /Architect/i)
})

test('Emids Technologies Limited exact backlog row resolves from the local catalog', async () => {
  const { EMIDS_TECHNOLOGIES_LIMITED_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Emids Technologies Limited\n',
    catalog: [hydrateProviderCatalogEntry(EMIDS_TECHNOLOGIES_LIMITED_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('Emids Technologies Limited scraper extracts India jobs from the Oracle Cloud finder and detail APIs', async () => {
  const emids = await loadScriptModule()
  const jobs = await emids.run({
    fetchText: async (url) => {
      if (url === emids.CAREERS_URL) return careersHtml
      if (url === emids.CANDIDATE_EXPERIENCE_URL) return candidateExperienceHtml
      assert.fail(`Unexpected fetchText URL: ${url}`)
    },
    fetchJson: async (url) => {
      if (url === emids.buildSearchUrl({ page: 0 })) return listingPayload
      if (url === emids.buildJobDetailApiUrl('REQ-1001')) return detailPayload
      assert.fail(`Unexpected fetchJson URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 1)
  assert.deepEqual(
    jobs.map(({ title, department, location, country, employmentType, sourceUrl, applyUrl, minimumQualification }) => ({
      title,
      department,
      location,
      country,
      employmentType,
      sourceUrl,
      applyUrl,
      minimumQualification,
    })),
    [
      {
        title: 'Business Analyst',
        department: 'Consulting',
        location: 'Bengaluru, Karnataka, India',
        country: 'India',
        employmentType: 'Regular',
        sourceUrl:
          'https://fa-eupt-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/REQ-1001',
        applyUrl:
          'https://fa-eupt-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/REQ-1001',
        minimumQualification: 'Bachelor degree and prior BA experience.',
      },
    ],
  )
  assert.match(jobs[0].jobDescription, /stakeholders/i)
})

test('Emids Technologies Limited scraper fails closed when the first-party handoff changes', async () => {
  const emids = await loadScriptModule()

  await assert.rejects(
    emids.run({
      fetchText: async (url) => {
        if (url === emids.CAREERS_URL) {
          return '<html><head><title>Careers - Emids</title></head><body>No open roles link</body></html>'
        }
        return candidateExperienceHtml
      },
      fetchJson: async () => listingPayload,
    }),
    /verified first-party careers page/i,
  )
})
