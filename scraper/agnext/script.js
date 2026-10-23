import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'agnext'
export const COMPANY = 'AgNext'
export const OFFICIAL_CAREERS_URL = 'https://www.agnext.com/'
export const JOB_OPENINGS_URL = 'https://agnext.keka.com/careers'

export const createAgNextScraper = ({ fetchImpl = fetch, timeoutMs = 15000 } = {}) => ({
  async run({ signal } = {}) {
    signal?.throwIfAborted()
    const request = (url) => fetchTextWithRetry(url, {
      fetchImpl, signal, timeoutMs, attempts: 1,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Jobverify)', Accept: 'text/html' },
    })
    const homepage = await request(OFFICIAL_CAREERS_URL)
    const hasHandoff = [...homepage.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi)]
      .some((match) => {
        try {
          return new URL(match[1], OFFICIAL_CAREERS_URL).href.replace(/\/$/, '') === JOB_OPENINGS_URL
        } catch { return false }
      })
    if (!/agnext/i.test(homepage) || !hasHandoff) throw new Error('AgNext official careers handoff is missing')
    const board = await request(JOB_OPENINGS_URL)
    signal?.throwIfAborted()
    if (!board.trim() || /<title[^>]*>[^<]*(?:access denied|forbidden|just a moment)/i.test(board)) {
      throw new Error('AgNext careers board is blocked or empty')
    }
    return attachInventoryEvidence([], {
      status: 'discovery-only', surface: JOB_OPENINGS_URL, firstParty: true,
      listingComplete: false, pagesFetched: 2, verifiedAt: new Date().toISOString(),
      reason: 'official-keka-handoff-observed-listing-contract-unverified',
    })
  },
})

export const run = async (options = {}) => createAgNextScraper(options).run(options)

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scraper/agnext/script.js')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
