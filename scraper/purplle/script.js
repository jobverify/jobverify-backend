import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readNativeDocument } from '../../scraper-support/utils/activeNativeHtml.js'
import { attachInventoryEvidence, readInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { collectPurplleNative, LISTING_URL } from './native.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'purplle'
export const COMPANY = 'Purplle'
export const CAREERS_URL = 'https://www.purplle.com/careers'
export const ORGANIZATION_ID = '2706205'

const gap = (message, cause) => Object.assign(new Error(message, { cause }), {
  code: 'PURPLLE_COVERAGE_GAP', source: SOURCE, partial: true, abortRetries: true,
})

export const createPurplleScraper = ({ fetchImpl = fetch, timeoutMs = 45000, now = () => new Date().toISOString() } = {}) => ({
  async run({ signal } = {}) {
    signal?.throwIfAborted()
    const controller = new AbortController()
    const onCallerAbort = () => controller.abort(signal.reason)
    signal?.addEventListener('abort', onCallerAbort, { once: true })
    const timer = setTimeout(() => controller.abort(gap('Purplle aggregate fetch/body deadline exceeded')), timeoutMs)
    let onAbort
    const aborted = new Promise((_, reject) => {
      onAbort = () => reject(controller.signal.reason)
      controller.signal.addEventListener('abort', onAbort, { once: true })
    })
    let pagesFetched = 0
    const read = async url => {
      controller.signal.throwIfAborted()
      const response = await fetchImpl(url, { signal: controller.signal, redirect: 'manual',
        headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0 (compatible; Jobverify)' } })
      controller.signal.throwIfAborted()
      if (!response.ok || response.status !== 200) throw Object.assign(gap(`Purplle native HTTP ${response.status}`), { status: response.status })
      if (response.url !== url) throw gap('Purplle native final URL changed')
      let html
      if (response.body?.getReader) {
        const reader = response.body.getReader(), chunks = []
        let bytes = 0
        const cancel = () => { Promise.resolve(reader.cancel(controller.signal.reason)).catch(() => {}) }
        controller.signal.addEventListener('abort', cancel, { once: true })
        try {
          while (true) {
            const part = await reader.read()
            controller.signal.throwIfAborted()
            if (part.done) break
            bytes += part.value.byteLength
            if (bytes > 3000000) { await reader.cancel(); throw gap('Purplle native streamed body exceeds byte limit') }
            chunks.push(Buffer.from(part.value))
          }
          html = Buffer.concat(chunks).toString('utf8')
        } finally {
          controller.signal.removeEventListener('abort', cancel)
          reader.releaseLock?.()
        }
      } else {
        html = await response.text()
      }
      controller.signal.throwIfAborted()
      if (typeof html !== 'string' || !html.trim() || Buffer.byteLength(html) > 3000000) throw gap('Purplle native body is unavailable or oversized')
      pagesFetched++
      return html
    }
    try {
      return await Promise.race([aborted, (async () => {
        const html = await read(CAREERS_URL)
        const doc = readNativeDocument(html)
        const links = doc.nodes(node => node.tag === 'a')
        const employerLink = links.some(node => {
          try {
            const url = new URL(node.attrs.href)
            return url.protocol === 'https:' && url.hostname === 'www.linkedin.com' && url.pathname.replace(/\/$/, '') === `/company/${ORGANIZATION_ID}`
          } catch { return false }
        })
        if (!employerLink || !links.some(node => node.attrs.href === 'mailto:career@purplle.com')) {
          throw gap('Purplle active careers contact or exact employer handoff changed')
        }
        if (doc.nodes(node => doc.hasClass(node, 'panel-title')).length > 0) {
          throw gap('Purplle now exposes active role panels; renewed country, description and apply validation required')
        }
        const { jobs, reason } = await collectPurplleNative({ read, now })
        return attachInventoryEvidence(jobs, {
          status: 'coverage-gap', surface: LISTING_URL, firstParty: true, listingComplete: false,
          pagesFetched, reportedTotal: null, indiaFacetCount: null, verifiedAt: now(),
          reason,
        })
      })()])
    } catch (error) {
      if (signal?.aborted) throw signal.reason
      if (error?.code === 'PURPLLE_COVERAGE_GAP') throw error
      throw gap('Purplle live discovery failed; inventory is unknown', error)
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onCallerAbort)
      controller.signal.removeEventListener('abort', onAbort)
      controller.abort(gap('Purplle inspection ended'))
    }
  },
})

export const run = async (options = {}) => createPurplleScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const jobs = await run()

  if (readInventoryEvidence(jobs)?.listingComplete !== true) {
    if (process.argv.includes('--dry-run')) {
      const { writeFile } = await import('node:fs/promises')
      await writeFile(path.join(currentDir, 'inventory-evidence.json'), JSON.stringify(readInventoryEvidence(jobs), null, 2))
    }
    console.error(readInventoryEvidence(jobs)?.reason)
    process.exitCode = 1
  } else if (process.argv.includes('--dry-run')) {
    const { saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    const { saveToDB } = await import('../../scraper-support/utils/saveToDB.js')
    await saveToDB(jobs, SOURCE)
  }
}
