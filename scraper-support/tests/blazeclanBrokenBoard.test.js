import assert from 'node:assert/strict'
import test from 'node:test'
import { run, CAREERS_URL } from '../../scraper/blazeclantechnologies/script.js'
test('Blazeclan dead Zoho handoff rejects the snapshot instead of marking all jobs missing', async () => {
  const careers = 'Join us to grow your career by doing what you love to do and treading the path where you want to go. <a href="https://blazeclan.zohorecruit.in/jobs/Careers" class="cta-btn">Current Openings</a>'
  await assert.rejects(run({fetchText: async url => url === CAREERS_URL ? careers : 'blazeclan.zohorecruit.in does not exist. Powered by Zoho'}), error => error.code === 'BLAZECLAN_BOARD_UNAVAILABLE')
})
