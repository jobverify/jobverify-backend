import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { document } from '../../scraper-support/shared/rmkNativePairHtml.js'
import { activeHead, readNativeDocument } from '../../scraper-support/utils/activeNativeHtml.js'
import { normalizeInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'incred'
export const COMPANY = 'InCred'
export const FIRST_PARTY_ROOT_URL = 'https://incred.com/Career-Page/'

const coverageGap = (reason, now, { firstParty = false, pagesFetched = 0, contactEmails = [], cause } = {}) => Object.assign(
  new Error(`InCred coverage gap: ${reason}`, { cause }), {
    code: 'INCRED_COVERAGE_GAP', reason, partial: true, contactEmails,
    inventoryEvidence: normalizeInventoryEvidence({
      status: 'coverage-gap', surface: FIRST_PARTY_ROOT_URL, firstParty,
      listingComplete: false, reportedTotal: null, indiaFacetCount: null,
      pagesFetched, verifiedAt: now(), reason,
    }),
  })

export const createInCredScraper = () => ({
  async run({ fetchImpl = globalThis.fetch, signal, timeoutMs = 20000, now = () => new Date().toISOString() } = {}) {
    signal?.throwIfAborted()
    if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw Error('Invalid InCred aggregate deadline')
    const deadline = new AbortController()
    const combined = signal ? AbortSignal.any([signal, deadline.signal]) : deadline.signal
    let onAbort, timer
    const interrupted = new Promise((_, reject) => {
      onAbort = () => reject(combined.reason)
      combined.addEventListener('abort', onAbort, { once: true })
      timer = setTimeout(() => deadline.abort(Error('InCred aggregate deadline exceeded')), timeoutMs)
    })
    const inspect = async () => {
      let html
      try {
        combined.throwIfAborted()
        const response = await fetchImpl(FIRST_PARTY_ROOT_URL, {
          signal: combined, redirect: 'error', headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' },
        })
        combined.throwIfAborted()
        if (response?.status !== 200 || response.url !== FIRST_PARTY_ROOT_URL) throw Error('Native HTTP status or final URL changed')
        html = await response.text()
        combined.throwIfAborted()
      } catch (cause) {
        combined.throwIfAborted()
        throw coverageGap('upstream-unavailable', now, { cause })
      }
      let doc
      try {
        if (typeof html !== 'string' || Buffer.byteLength(html, 'utf8') > 4 * 1024 * 1024) throw Error('Missing or oversized body')
        const envelope = document(html)
        for (const tag of ['html', 'head', 'body']) {
          const nodes = envelope.nodes(node => node.tag === tag)
          if (nodes.length !== 1) throw Error('Missing or ambiguous native envelope')
          envelope.outer(nodes[0])
        }
        const titles = activeHead(html).titles
        if (titles.length !== 1 || titles[0] !== 'Career Page | InCred Financial Services') throw Error('Native employer identity changed')
        doc = readNativeDocument(html)
        const openings = doc.nodes(node => node.attrs.id === 'apply-now')
        if (openings.length !== 1 || !doc.text(openings[0]).includes('Check out the open positions below')) throw Error('Native careers section changed')
      } catch (cause) {
        throw coverageGap('unrecognized-careers-response', now, { pagesFetched: 1, cause })
      }
      const contactEmails = [...new Set(doc.nodes(node => node.tag === 'a' && ['mailto:jobs@incred.com', 'mailto:tech.jobs@incred.com'].includes(node.attrs.href))
        .map(node => node.attrs.href.slice(7)))]
      // The reviewed native client initializes its inventory as undefined,
      // renders this same sentinel before its POST resolves, and keeps it on
      // upstream errors. SSR text therefore cannot certify even Finance empty.
      // The native feed, group tabs and recruiting channels remain unverified.
      throw coverageGap('unverified-recruiting-inventory', now, { firstParty: true, pagesFetched: 1, contactEmails })
    }
    try { return await Promise.race([inspect(), interrupted]) }
    finally {
      clearTimeout(timer)
      combined.removeEventListener('abort', onAbort)
      deadline.abort(Error('InCred inspection settled'))
    }
  },
})

export const run = async (options = {}) => createInCredScraper().run(options)

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectExecution) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
