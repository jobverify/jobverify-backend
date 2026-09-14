import assert from 'node:assert/strict'
import test from 'node:test'
import { run, CAREERS_URL, CAREERS_LIST_URL } from '../../scraper/netcorecloud/script.js'
const landing = '<title>Careers - Netcore</title><iframe src="https://careerpagenetcore.lovable.app/"></iframe>'
const listing = '<title>Careers list - Netcore</title><iframe id="mnhembedded"></iframe><script src="https://netcoreai.mynexthire.com/employer/ui/js/jobboard/careers-integration.js"></script><script>mnh_ci_onreadystatechange("careers", "netcoreai")</script>'
const role = { reqId: 1034, statusId: 3, reqTitle: 'Senior AI Platform Engineer', location: 'Bengaluru', locationAddress: 'Karnataka 560102', locationGroup: [], buName: 'Unbxd', jdDisplay: 'Build AI platform systems.', approvedOn: '2026-08-10T05:16:15.621+0000', employmentType: 'full-time', expMin: 3, expMax: 5 }
const fetchPage = async url => ({ status: 200, url: url.replace('netcorecloud.com','netcore.ai'), html: url === CAREERS_URL ? landing : listing })
test('Netcore follows the current official MyNextHire integration and filters the complete inventory to India', async () => {
  const jobs = await run({ fetchPage, fetchJson: async (url, options) => {
    assert.equal(url, 'https://netcoreai.mynexthire.com/employer/careers/reqlist/get')
    assert.equal(options.method, 'POST')
    assert.equal(JSON.parse(options.body).filterByBuId, -1)
    return { reqDetailsBOList: [role, { ...role, reqId: 200, location: 'Philippines', locationAddress: 'Manila' }] }
  } })
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].jobId, '1034')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].city, 'Bengaluru')
  assert.equal(jobs[0].postingDate, '2026-08-10')
  const url = new URL(jobs[0].sourceUrl)
  assert.equal(url.hostname, 'netcoreai.mynexthire.com')
  assert.equal(JSON.parse(Buffer.from(url.searchParams.get('p'), 'base64')).reqId, 1034)
})
test('Netcore rejects blocked, incomplete, duplicate and unknown-country snapshots', async () => {
  for (const payload of [{}, { reqDetailsBOList: null }, { reqDetailsBOList: [role, {...role, reqId: 200, reqTitle: ''}] }, { reqDetailsBOList: [role, role] }, { reqDetailsBOList: [{...role, location: 'Remote', locationAddress: ''}] }]) {
    await assert.rejects(run({ fetchPage, fetchJson: async () => payload }), /invalid|incomplete|duplicate|country/i)
  }
  await assert.rejects(run({ fetchPage: async url => url === CAREERS_URL ? await fetchPage(url) : {status:403,url,html:'<title>Error 403 Forbidden</title><h1>403 Forbidden</h1>'}, fetchJson: async () => assert.fail('blocked page cannot hand off') }), /403|blocked/i)
  await assert.rejects(run({ fetchPage, fetchJson: async () => { throw new Error('HTTP 503') } }), /503/)
})
test('Netcore never accepts a verified loading shell as a zero-job snapshot', async () => {
  const oldLanding = '<title>Careers - Netcore</title>Netcore Cloud is now Netcore.ai Please wait while you are redirected to the right page'
  const oldList = '<title>Careers list - Netcore</title>Please wait while you are redirected to the right page'
  await assert.rejects(run({ fetchPage: async url => ({status:200,url,html:url === CAREERS_URL?oldLanding:oldList}) }), /unavailable|handoff|incomplete/i)
})
