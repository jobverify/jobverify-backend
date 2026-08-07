import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Join Codewave</title>
  </head>
  <body>
    <h2>Open Positions.</h2>
    <div class="cw-vacancies">
      <div class="cw-vacancy-row">
        <h3 class="cw-vacancy-title">Quality Builder: Web &amp; Cross-Platform</h3>
        <p class="cw-job-location">Bangalore</p>
        <div class="blue-href cw-vacancy-slug">
          <a href="https://codewave.com/careers/quality-builder-web-cross-platform/">Find out more</a>
        </div>
      </div>
      <div class="cw-vacancy-row">
        <h3 class="cw-vacancy-title">Product Owner: Vision &amp; Delivery</h3>
        <p class="cw-job-location">Bangalore</p>
        <div class="blue-href cw-vacancy-slug">
          <a href="https://codewave.com/careers/product-owner-vision-delivery/">Find out more</a>
        </div>
      </div>
      <div class="cw-vacancy-row">
        <h3 class="cw-vacancy-title">Product Builder: Full Stack, Golang</h3>
        <p class="cw-job-location">Bangalore</p>
        <div class="blue-href cw-vacancy-slug">
          <a href="https://codewave.com/careers/product-builder-full-stack-golang/">Find out more</a>
        </div>
      </div>
    </div>
    <a href="/careers/?cwpage=2">2</a>
    <a href="/careers/?cwpage=3">3</a>
  </body>
</html>
`

const careersPage2Html = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Join Codewave</title>
  </head>
  <body>
    <h2>Open Positions.</h2>
    <div class="cw-vacancies">
      <div class="cw-vacancy-row">
        <h3 class="cw-vacancy-title">Product Builder: Full Stack</h3>
        <p class="cw-job-location">Bangalore</p>
        <div class="blue-href cw-vacancy-slug">
          <a href="https://codewave.com/careers/product-builder-full-stack/">Find out more</a>
        </div>
      </div>
      <div class="cw-vacancy-row">
        <h3 class="cw-vacancy-title">Infra Builder: Senior DevOps &amp; Cloud</h3>
        <p class="cw-job-location">Bangalore</p>
        <div class="blue-href cw-vacancy-slug">
          <a href="https://codewave.com/careers/infra-builder-senior-devops-cloud/">Find out more</a>
        </div>
      </div>
      <div class="cw-vacancy-row">
        <h3 class="cw-vacancy-title">Infra Builder: DevOps &amp; Cloud</h3>
        <p class="cw-job-location">Bangalore</p>
        <div class="blue-href cw-vacancy-slug">
          <a href="https://codewave.com/careers/infra-builder-devops-cloud/">Find out more</a>
        </div>
      </div>
    </div>
  </body>
</html>
`

const careersPage3Html = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Join Codewave</title>
  </head>
  <body>
    <h2>Open Positions.</h2>
    <div class="cw-vacancies">
      <div class="cw-vacancy-row">
        <h3 class="cw-vacancy-title">AI Builder: Models &amp; Agents</h3>
        <p class="cw-job-location">Bangalore</p>
        <div class="blue-href cw-vacancy-slug">
          <a href="https://codewave.com/careers/ai-builder-models-agents/">Find out more</a>
        </div>
      </div>
    </div>
  </body>
</html>
`

const qualityBuilderHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Quality Builder: Web & Cross-Platform - Codewave</title>
  </head>
  <body>
    <h1>Quality Builder: Web & Cross-Platform</h1>
    <h6>What we offer</h6>
    <p>Full time · Bangalore · <a href="https://codewave.com/en/apply"><span class="__cf_email__">[email protected]</span></a></p>
    <a href="https://codewave.com/en/apply?job_id=35572">Apply for this job <img src="arrow.svg" alt=""></a>
  </body>
</html>
`

const productOwnerHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Product Owner: Vision & Delivery - Codewave</title>
  </head>
  <body>
    <h1>Product Owner: Vision & Delivery</h1>
    <h6>What we offer</h6>
    <p>Full time · Bangalore · <a href="https://codewave.com/en/apply">jobs@codewave.com</a></p>
    <a href="https://codewave.com/en/apply?job_id=35576">Apply for this job</a>
  </body>
</html>
`

const productBuilderGolangHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Product Builder: Full Stack, Golang - Codewave</title>
  </head>
  <body>
    <h1>Product Builder: Full Stack, Golang</h1>
    <h6>What we offer</h6>
    <p>Full time · Bangalore · <a href="https://codewave.com/en/apply">jobs@codewave.com</a></p>
    <a href="https://codewave.com/en/apply?job_id=35575">Apply for this job</a>
  </body>
</html>
`

const productBuilderHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Product Builder: Full Stack - Codewave</title>
  </head>
  <body>
    <h1>Product Builder: Full Stack</h1>
    <h6>What we offer</h6>
    <p>Full time · Bangalore · <a href="https://codewave.com/en/apply">jobs@codewave.com</a></p>
    <a href="https://codewave.com/en/apply?job_id=35574">Apply for this job</a>
  </body>
</html>
`

const seniorDevopsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Infra Builder: Senior DevOps & Cloud - Codewave</title>
  </head>
  <body>
    <h1>Infra Builder: Senior DevOps & Cloud</h1>
    <h6>What we offer</h6>
    <p>Full time · Bangalore · <a href="https://codewave.com/en/apply">jobs@codewave.com</a></p>
    <a href="https://codewave.com/en/apply?job_id=35573">Apply for this job</a>
  </body>
</html>
`

const devopsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Infra Builder: DevOps & Cloud - Codewave</title>
  </head>
  <body>
    <h1>Infra Builder: DevOps & Cloud</h1>
    <h6>What we offer</h6>
    <p>Full time · Bangalore · <a href="https://codewave.com/en/apply">jobs@codewave.com</a></p>
    <a href="https://codewave.com/en/apply?job_id=35571">Apply for this job</a>
  </body>
</html>
`

const aiBuilderHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>AI Builder: Models & Agents - Codewave</title>
  </head>
  <body>
    <h1>AI Builder: Models & Agents</h1>
    <h6>What we offer</h6>
    <p>Full time · Bangalore · <a href="https://codewave.com/en/apply">jobs@codewave.com</a></p>
    <a href="https://codewave.com/en/apply?job_id=35570">Apply for this job</a>
  </body>
</html>
`

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/codewavetechnologies/catalog.js')
  } catch {
    assert.fail('Expected Codewave Technologies catalog module at ../../scraper/codewavetechnologies/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/codewavetechnologies/script.js')
  } catch {
    assert.fail('Expected Codewave Technologies scraper module at ../../scraper/codewavetechnologies/script.js')
  }
}

test('Codewave Technologies local catalog captures the verified first-party careers contract', async () => {
  const { CODEWAVE_TECHNOLOGIES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(CODEWAVE_TECHNOLOGIES_CATALOG)

  assert.equal(defaultCatalog, CODEWAVE_TECHNOLOGIES_CATALOG)
  assert.equal(provider.source, 'codewavetechnologies')
  assert.equal(provider.companyName, 'Codewave Technologies')
  assert.equal(provider.officialBrandName, 'Codewave')
  assert.equal(provider.companyCareerPage, 'https://codewave.com/careers/')
  assert.equal(provider.companyDomain, 'codewave.com')
  assert.equal(provider.atsPlatform, 'first-party-html-job-pages')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-listing-page-plus-detail-pages')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+paginated-opening-rows+company-hosted-apply-pages',
  )
  assert.equal(provider.verifiedOn, '2026-08-01')
  assert.match(provider.verifiedSurfaceSummary, /Quality Builder: Web & Cross-Platform/i)
  assert.match(provider.verifiedSurfaceSummary, /Product Owner: Vision & Delivery/i)
  assert.match(provider.verifiedSurfaceSummary, /Infra Builder: Senior DevOps & Cloud/i)
  assert.match(provider.verifiedSurfaceSummary, /AI Builder: Models & Agents/i)
  assert.match(provider.verifiedSurfaceSummary, /cwpage=2/i)
  assert.match(provider.verifiedSurfaceSummary, /job_id=35572/i)
})

test('Codewave Technologies helpers stay pinned to the verified careers page and detail pages', async () => {
  const codewave = await loadScriptModule()

  assert.equal(codewave.SOURCE, 'codewavetechnologies')
  assert.equal(codewave.COMPANY, 'Codewave Technologies')
  assert.equal(codewave.CAREERS_URL, 'https://codewave.com/careers/')
  assert.equal(codewave.VERIFIED_ON, '2026-08-01')
  assert.equal(codewave.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(codewave.extractOpeningCards(careersHtml), [
    {
      title: 'Quality Builder: Web & Cross-Platform',
      location: 'Bangalore',
      detailUrl: 'https://codewave.com/careers/quality-builder-web-cross-platform/',
    },
    {
      title: 'Product Owner: Vision & Delivery',
      location: 'Bangalore',
      detailUrl: 'https://codewave.com/careers/product-owner-vision-delivery/',
    },
    {
      title: 'Product Builder: Full Stack, Golang',
      location: 'Bangalore',
      detailUrl: 'https://codewave.com/careers/product-builder-full-stack-golang/',
    },
  ])
  assert.deepEqual(codewave.extractPaginationUrls(careersHtml), [
    'https://codewave.com/careers/?cwpage=2',
    'https://codewave.com/careers/?cwpage=3',
  ])
  assert.deepEqual(codewave.extractOpeningCards(careersPage2Html), [
    {
      title: 'Product Builder: Full Stack',
      location: 'Bangalore',
      detailUrl: 'https://codewave.com/careers/product-builder-full-stack/',
    },
    {
      title: 'Infra Builder: Senior DevOps & Cloud',
      location: 'Bangalore',
      detailUrl: 'https://codewave.com/careers/infra-builder-senior-devops-cloud/',
    },
    {
      title: 'Infra Builder: DevOps & Cloud',
      location: 'Bangalore',
      detailUrl: 'https://codewave.com/careers/infra-builder-devops-cloud/',
    },
  ])
  assert.deepEqual(codewave.extractDetailSignals(qualityBuilderHtml), {
    employmentType: 'Full-time',
    location: 'Bangalore',
    applyUrl: 'https://codewave.com/en/apply?job_id=35572',
  })
})

test('Codewave Technologies run validates the first-party careers page and returns job listings', async () => {
  const codewave = await loadScriptModule()
  const requestedUrls = []
  const jobs = await codewave.createCodewaveTechnologiesScraper({
    now: () => '2026-08-01T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === codewave.CAREERS_URL) return careersHtml
      if (url === 'https://codewave.com/careers/?cwpage=2') return careersPage2Html
      if (url === 'https://codewave.com/careers/?cwpage=3') return careersPage3Html
      if (url === 'https://codewave.com/careers/quality-builder-web-cross-platform/') return qualityBuilderHtml
      if (url === 'https://codewave.com/careers/product-owner-vision-delivery/') return productOwnerHtml
      if (url === 'https://codewave.com/careers/product-builder-full-stack-golang/') return productBuilderGolangHtml
      if (url === 'https://codewave.com/careers/product-builder-full-stack/') return productBuilderHtml
      if (url === 'https://codewave.com/careers/infra-builder-senior-devops-cloud/') return seniorDevopsHtml
      if (url === 'https://codewave.com/careers/infra-builder-devops-cloud/') return devopsHtml
      if (url === 'https://codewave.com/careers/ai-builder-models-agents/') return aiBuilderHtml
      throw new Error(`Unexpected Codewave URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    codewave.CAREERS_URL,
    'https://codewave.com/careers/?cwpage=2',
    'https://codewave.com/careers/?cwpage=3',
    'https://codewave.com/careers/quality-builder-web-cross-platform/',
    'https://codewave.com/careers/product-owner-vision-delivery/',
    'https://codewave.com/careers/product-builder-full-stack-golang/',
    'https://codewave.com/careers/product-builder-full-stack/',
    'https://codewave.com/careers/infra-builder-senior-devops-cloud/',
    'https://codewave.com/careers/infra-builder-devops-cloud/',
    'https://codewave.com/careers/ai-builder-models-agents/',
  ])
  assert.equal(jobs.length, 7)
  assert.deepEqual(jobs.map((job) => job.title), [
    'Quality Builder: Web & Cross-Platform',
    'Product Owner: Vision & Delivery',
    'Product Builder: Full Stack, Golang',
    'Product Builder: Full Stack',
    'Infra Builder: Senior DevOps & Cloud',
    'Infra Builder: DevOps & Cloud',
    'AI Builder: Models & Agents',
  ])
  assert.equal(jobs[0].location, 'Bangalore, India')
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.equal(jobs[0].source, 'codewavetechnologies')
  assert.equal(jobs[0].applyUrl, 'https://codewave.com/en/apply?job_id=35572')
})

test('Codewave Technologies fails closed when the verified careers shell changes materially', async () => {
  const codewave = await loadScriptModule()

  await assert.rejects(
    codewave.createCodewaveTechnologiesScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /verified Codewave careers page/i,
  )
})
