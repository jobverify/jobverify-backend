import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { setImmediate, setTimeout as wait } from 'node:timers/promises'
import { runNativeCargill } from '../../scraper/cargill.workday/nativeRun.js'
import { HOME, CAREERS, SEARCH, CLIENT, CORE, parseCargillPage } from '../../scraper/cargill.workday/nativeContract.js'

const fixture = JSON.parse(gunzipSync(fs.readFileSync(new URL('../../scraper/cargill.workday/fixtures/native-20261021.json.gz', import.meta.url))))
const allRows = fixture.pages.flatMap((page, index) => parseCargillPage(page, index + 1, 81).jobs)
const rows = fixture.roles.slice(0, 3).map(role => allRows.find(row => row.sourceUrl === role.public.url))
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
const payload = { hasJobs: true, hasContent: false,
  filters: '<input type="checkbox" checked data-facet-type="2" data-id="1269750" data-display="India" data-count="3">',
  results: '<section id="search-results" data-total-results="3" data-total-job-results="3" data-total-pages="1" data-current-page="1" data-records-per-page="15">'
    + rows.map(row => `<a data-job-id="${row.publicJobId}" href="${row.sourceUrl}"><h3>${escape(row.title)}</h3><span class="job-location">${escape(row.nativeListingLocation)}</span></a>`).join('') + '</section>',
}
let active = 0, code, activeAtRejection
const settlements = []
const fetchImpl = async (url, { signal }) => {
  const body = url === HOME ? fixture.corporate : url === CAREERS ? fixture.careers
    : url === SEARCH ? fixture.search.replace('data-count="81"\n', 'data-count="3"\n').replace(/(data-id="1269750"[^>]*data-count=")81"/, '$13"')
      : url === CLIENT ? fixture.client : url === CORE ? fixture.core : url.startsWith(SEARCH + '/results?') ? JSON.stringify(payload) : null
  if (body !== null) return { status: 200, url: url === CAREERS ? CAREERS + 'en' : url, text: async () => body }
  if (url === rows[0].sourceUrl) { await setImmediate(); return { status: 503, url, text: async () => 'Unavailable' } }
  active++
  return new Promise((_, reject) => signal.addEventListener('abort', () => {
    // Fetch observes cancellation immediately but completes its asynchronous
    // transport cleanup shortly afterward, as cooperative adapters may do.
    settlements.push(wait(20).then(() => { active--; reject(signal.reason) }))
  }, { once: true }))
}
try { await runNativeCargill({ fetchImpl, now: '2026-10-21T03:00:00Z', timeoutMs: 1000 }) }
catch (error) { code = error.code; activeAtRejection = active }
await Promise.all(settlements)
console.log(JSON.stringify({ code, activeAtRejection, activeAfterSettlements: active }))
