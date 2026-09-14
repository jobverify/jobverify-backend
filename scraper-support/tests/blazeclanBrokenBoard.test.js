import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CAREERS_URL,
  isBlazeclanApexTlsAltnameError,
  run,
} from '../../scraper/blazeclantechnologies/script.js'
import { readInventoryEvidence } from '../utils/inventoryEvidence.js'

const careers = 'Join us to grow your career by doing what you love to do and treading the path where you want to go. <a href="https://blazeclan.zohorecruit.in/jobs/Careers" class="cta-btn">Current Openings</a>'
const deadBoard = 'blazeclan.zohorecruit.in does not exist. Powered by Zoho'

test('Blazeclan dead Zoho handoff returns discovery-only evidence instead of failing the source', async () => {
  const jobs = await run({
    fetchText: async url => url === CAREERS_URL ? careers : deadBoard,
    now: () => '2026-09-14T00:00:00.000Z',
  })

  assert.deepEqual(jobs, [])
  const evidence = readInventoryEvidence(jobs)
  assert.equal(evidence?.status, 'discovery-only')
  assert.equal(evidence?.surface, CAREERS_URL)
  assert.equal(evidence?.listingComplete, false)
  assert.match(evidence?.reason || '', /official Zoho handoff is unavailable/i)
})

test('Blazeclan recognizes the current apex TLS certificate mismatch as a blocked discovery surface', async () => {
  const tlsError = Object.assign(new TypeError('fetch failed'), {
    cause: {
      code: 'ERR_TLS_CERT_ALTNAME_INVALID',
      message: "Hostname/IP does not match certificate's altnames: Host: blazeclan.com. is not in the cert's altnames: DNS:*.blazeclan.com",
    },
  })

  assert.equal(isBlazeclanApexTlsAltnameError(tlsError), true)

  const jobs = await run({
    fetchText: async () => { throw tlsError },
    now: () => '2026-09-14T00:00:00.000Z',
  })

  assert.deepEqual(jobs, [])
  const evidence = readInventoryEvidence(jobs)
  assert.equal(evidence?.status, 'discovery-only')
  assert.equal(evidence?.surface, CAREERS_URL)
  assert.match(evidence?.reason || '', /TLS certificate host mismatch/i)
})

test('Blazeclan does not downgrade unrelated fetch errors to discovery-only evidence', async () => {
  const error = new Error('connect ECONNREFUSED')

  await assert.rejects(
    run({
      fetchText: async () => { throw error },
    }),
    err => err === error,
  )
})
