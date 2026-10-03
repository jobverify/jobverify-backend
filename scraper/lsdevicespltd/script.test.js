import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CAREERS_URL,
  COMPANY,
  LEGAL_URL,
  SOURCE,
  createLSDevicesScraper,
  hasOfficialLegalIdentitySignal,
} from './script.js'

const legalHtml = `<html><head><title>Terms of Service | Lifesigns | Lifesigns</title></head><body>
  LS DEVICES PRIVATE LIMITED, ON BEHALF OF ITSELF AND ITS AFFILIATES/GROUP COMPANIES
  UNDER THE BRAND 'LIFESIGNS', OPERATES THE WEBSITE [www.lifesigns.us].
</body></html>`
const lifeSignsJob = {
  source: 'lifesigns', company: 'LifeSigns', country: 'India',
  jobId: 'lifesigns-junior-video-editor', requisitionId: 'wix-123',
  title: 'Junior Video Editor', sourceUrl: 'https://www.lifesigns.us/careers/junior-video-editor/',
  applyUrl: 'https://www.lifesigns.us/careers/junior-video-editor/',
}

test('LS Devices verifies the legal owner of the LifeSigns careers brand', () => {
  assert.equal(SOURCE, 'lsdevicespltd')
  assert.equal(COMPANY, 'LS Devices (P) Ltd')
  assert.equal(CAREERS_URL, 'https://www.lifesigns.us/careers/')
  assert.equal(LEGAL_URL, 'https://www.lifesigns.us/terms-of-service/')
  assert.equal(hasOfficialLegalIdentitySignal(legalHtml), true)
  assert.equal(hasOfficialLegalIdentitySignal(legalHtml.replace('LS DEVICES PRIVATE LIMITED', 'OTHER COMPANY')), false)
})

test('LS Devices maps current first-party LifeSigns roles to the exact company source', async () => {
  const urls = []
  const jobs = await createLSDevicesScraper().run({
    fetchText: async (url) => { urls.push(url); return legalHtml },
    fetchLifeSignsJobs: async () => [lifeSignsJob],
  })
  assert.deepEqual(urls, [LEGAL_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, COMPANY)
  assert.equal(jobs[0].source, SOURCE)
  assert.equal(jobs[0].jobId, 'lsdevicespltd-lifesigns-junior-video-editor')
  assert.equal(jobs[0].requisitionId, 'wix-123')
  assert.equal(jobs[0].sourceUrl, lifeSignsJob.sourceUrl)
  assert.equal(jobs[0].atsPlatform, 'official-company-careers')
})

test('LS Devices fails closed when legal ownership or role scope is unverified', async () => {
  await assert.rejects(createLSDevicesScraper().run({
    fetchText: async () => legalHtml.replace('LS DEVICES PRIVATE LIMITED', 'OTHER COMPANY'),
    fetchLifeSignsJobs: async () => [lifeSignsJob],
  }), /legal identity/)
  await assert.rejects(createLSDevicesScraper().run({
    fetchText: async () => legalHtml,
    fetchLifeSignsJobs: async () => [{ ...lifeSignsJob, country: 'France' }],
  }), /inventory changed shape/)
})
