import assert from 'node:assert/strict'
import test from 'node:test'
import { run } from '../../scraper/orangebusiness/script.js'

const row = (id, company = 'Orange Business') => ({
  reqId: id, jobId: id, title: 'Engineer ' + id,
  country: 'INDIA', cityStateCountry: 'Gurgaon, INDIA', company,
})
const response = (jobs, totalHits = jobs.length) => ({ refineSearch: {
  status: 200, totalHits, hits: jobs.length,
  data: { jobs, aggregations: [{ field: 'country', value: { INDIA: totalHits } }] },
} })
const noListingHtml = async () => { throw new Error('Listing must use the scoped public widget') }

test('Orange requests exact public company and uppercase country facets and retains secondary India locations', async () => {
  const raw = Array.from({ length: 49 }, (_, index) => row(String(index)))
  raw[0] = { ...raw[0], company: undefined, companyName: 'Orange Business' }
  raw[1] = { ...raw[1], country: 'EGYPT', cityStateCountry: 'Cairo, EGYPT',
    multi_location_array: [{ location: 'Cairo, EGYPT' }, { location: 'Mumbai, INDIA' }] }
  let calls = 0
  const jobs = await run({ detailEnrichmentBudgetMs: 0, fetchText: noListingHtml,
    fetchJson: async (url, options) => {
      calls++
      assert.equal(url, 'https://orange.jobs/widgets')
      assert.equal(options.method, 'POST')
      const body = JSON.parse(options.body)
      assert.deepEqual(body.selected_fields, { country: ['INDIA'], companyName: ['Orange Business'] })
      assert.deepEqual(body.all_fields, ['country', 'companyName'])
      assert.equal(body.lang, 'en_gb')
      assert.equal(body.country, 'gb')
      assert.equal(body.size, 500)
      assert.equal(body.from, 0)
      assert.ok(options.signal)
      return response(raw)
    },
  })
  assert.equal(calls, 1)
  assert.equal(jobs.length, 49)
  assert.equal(new Set(jobs.map(job => job.jobId)).size, 49)
  assert.ok(jobs.every(job => job.company === 'Orange Business' && job.country === 'India' && job.sourceListingComplete !== false))
  assert.match(jobs.find(job => job.jobId === '1').location, /Mumbai/i)
})

for (const company of ['Orange Cyberdefense', null]) {
  test('Orange rejects a response that loses exact company scope: ' + company, async () => {
    await assert.rejects(run({ detailEnrichmentBudgetMs: 0, fetchText: noListingHtml,
      fetchJson: async () => response([row('1', company)]),
    }), /Orange.*company scope/i)
  })
}

test('Orange retains completeness checks when the server caps pages below the requested size', async () => {
  const offsets = []
  const jobs = await run({ detailEnrichmentBudgetMs: 0, fetchText: noListingHtml,
    fetchJson: async (url, options) => {
      const offset = JSON.parse(options.body).from
      offsets.push(offset)
      return response(offset === 0 ? [row('1'), row('2')] : [row('3')], 3)
    },
  })
  assert.deepEqual(offsets, [0, 2])
  assert.equal(jobs.length, 3)
  await assert.rejects(run({ detailEnrichmentBudgetMs: 0, fetchText: noListingHtml,
    fetchJson: async () => response([row('1')], 2),
  }), /duplicate page/i)
})

test('Orange rejects malformed API data and propagates cancellation before requests', async () => {
  await assert.rejects(run({ detailEnrichmentBudgetMs: 0, fetchText: noListingHtml,
    fetchJson: async () => ({ refineSearch: { status: 200, data: {} } }),
  }), /invalid listing payload/i)
  let calls = 0
  const reason = new Error('Source cancelled')
  await assert.rejects(run({ signal: AbortSignal.abort(reason), fetchText: noListingHtml,
    fetchJson: async () => { calls++; return response([]) },
  }), error => error === reason)
  assert.equal(calls, 0)
})
