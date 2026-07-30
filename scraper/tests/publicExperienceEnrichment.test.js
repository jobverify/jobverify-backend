import assert from 'node:assert/strict'
import test from 'node:test'

import {
  enrichJobWithPublicExperience,
  inferExperienceFromPublicPageHtml,
} from '../utils/publicExperienceEnrichment.js'

test('inferExperienceFromPublicPageHtml captures labeled required experience from a Virtusa-style page', () => {
  const enriched = inferExperienceFromPublicPageHtml({
    title: 'Cloud Engineer',
    company: 'Virtusa',
    applyUrl: 'https://www.virtusa.com/careers/job-search/in/cloud-engineer-vrt-123',
    experienceRequired: null,
  }, `
    <html>
      <body>
        <h1>Cloud Engineer</h1>
        <section>
          <h6>Required Experience</h6>
          <div>5</div>
        </section>
      </body>
    </html>
  `)

  assert.equal(enriched.experienceRequired, '5 years')
})

test('inferExperienceFromPublicPageHtml captures years of experience from an Oracle-style public job page', () => {
  const enriched = inferExperienceFromPublicPageHtml({
    title: 'Advanced Software Engr',
    company: 'Honeywell',
    applyUrl: 'https://ibqbjb.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/150196',
    experienceRequired: null,
  }, `
    <html>
      <body>
        <h2>Qualifications</h2>
        <ul>
          <li>10-15 years of experience leading user research and/or experience design.</li>
        </ul>
      </body>
    </html>
  `)

  assert.equal(enriched.experienceRequired, '10-15 years')
})

test('inferExperienceFromPublicPageHtml ignores company-history text that is not a job requirement', () => {
  const enriched = inferExperienceFromPublicPageHtml({
    title: 'Cloud Engineer',
    company: 'Quest Global',
    applyUrl: 'https://careers.example.com/jobs/cloud-engineer',
    experienceRequired: null,
  }, `
    <html>
      <body>
        <p>At Quest Global, with over 25 years as an engineering services provider, we believe in the power of doing things differently.</p>
      </body>
    </html>
  `)

  assert.equal(enriched.experienceRequired, null)
})

test('enrichJobWithPublicExperience fetches the official page and returns recovered experience', async () => {
  const job = {
    title: 'Cloud Engineer',
    company: 'Virtusa',
    applyUrl: 'https://www.virtusa.com/careers/job-search/in/cloud-engineer-vrt-123',
    sourceUrl: 'https://www.virtusa.com/careers/job-search/in/cloud-engineer-vrt-123',
    experienceRequired: null,
  }

  const enriched = await enrichJobWithPublicExperience(job, {
    fetchText: async (url) => {
      assert.equal(url, job.applyUrl)
      return `
        <html>
          <body>
            <h1>Cloud Engineer</h1>
            <section>
              <h6>Required Experience</h6>
              <div>5</div>
            </section>
          </body>
        </html>
      `
    },
  })

  assert.equal(enriched.experienceRequired, '5 years')
})

test('enrichJobWithPublicExperience falls back to browser-rendered page content when raw html is too thin', async () => {
  const job = {
    title: 'Lead Azure DevOps',
    company: 'Virtusa',
    applyUrl: 'https://www.virtusa.com/careers/job-search/in/hyderabad/azure/lead-azure-devops/creq264660',
    sourceUrl: 'https://www.virtusa.com/careers/job-search/in/hyderabad/azure/lead-azure-devops/creq264660',
    experienceRequired: null,
  }

  const enriched = await enrichJobWithPublicExperience(job, {
    fetchText: async () => '<html><body><h1>Lead Azure DevOps</h1></body></html>',
    fetchBrowserText: async (url) => {
      assert.equal(url, job.applyUrl)
      return `
        <html>
          <body>
            <h1>Lead Azure DevOps</h1>
            <section>
              <div>Required Experience</div>
              <div>5</div>
            </section>
          </body>
        </html>
      `
    },
  })

  assert.equal(enriched.experienceRequired, '5 years')
})
