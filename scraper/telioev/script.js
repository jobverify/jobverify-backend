import { createFailClosedSentinelScraper } from './failClosedSentinel.js'

export const SOURCE = 'telioev'
export const COMPANY = 'TelioEV'
export const CAREERS_URL = 'https://telioev.com/'
export const DISPOSITION = 'verified-exact-name-public-surface-fail-closed'

// Local evidence only confirms the exact-name TelioEV public company surface,
// not a stable enumerable jobs contract, so this provider remains fail-closed.
export const run = async () => createFailClosedSentinelScraper().run()
