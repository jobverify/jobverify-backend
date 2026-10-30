import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { readNativeDocument, activeHead } from '../../scraper-support/utils/activeNativeHtml.js'
import { readVisibleNativeDocument } from '../../scraper-support/utils/visibleNativeHtml.js'
import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

const HOME = 'https://lakechemicals.com/', BOARD = 'https://lakechemicals.com/job-search', SOURCE = 'lakechemicalspvtltd'
const reviewed = JSON.parse(readFileSync(new URL('./reviewedNativeScope.json', import.meta.url), 'utf8'))
const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex')
const requireNative = (ok, reason) => { if (!ok) throw new Error(`Lake native inventory: ${reason}`) }
const sorted = value => Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const descendants = (node, predicate) => node.inert ? [] : [ ...(predicate(node) ? [node] : []),
  ...node.children.filter(child => typeof child === 'object').flatMap(child => descendants(child, predicate)) ]
const exactlyOne = (rows, label) => { requireNative(rows.length === 1, `missing or ambiguous ${label}`); return rows[0] }
const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
const foreignNames = new Set(['United States of America', 'USA', 'Great Britain', 'Czech Republic'])
for (let first = 65; first <= 90; first++) for (let second = 65; second <= 90; second++) {
  const code = String.fromCharCode(first, second), name = countryNames.of(code)
  if (code !== 'IN' && name && name !== code && name !== 'Unknown Region') foreignNames.add(name)
}
const foreignCountryName = new RegExp(`(?<![\\p{L}\\p{N}])(?:${[...foreignNames].map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}\\p{N}])`, 'iu')

export const lakeExecutableScopeSignature = html => {
  const document = readNativeDocument(html)
  const visible = readVisibleNativeDocument(html, { strict: true })
  return hash({
    visibleText: visible.nodes(node => node.tag === 'body').map(visible.text).join(' '),
    attributes: document.nodes(node => Object.keys(node.attrs).length > 0).map(node => ({ tag: node.tag, attrs: sorted(node.attrs) })),
    scripts: document.nodes(node => node.tag === 'script').map(node => ({ attrs: sorted(node.attrs), body: node.raw || '' })),
    styles: [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map(match => match[1]),
    forms: document.nodes(node => node.tag === 'form').map(node => ({ attrs: sorted(node.attrs), text: document.text(node) })),
    frames: visible.frames().map(node => sorted(node.attrs)),
  })
}

const identity = (html, url) => {
  const head = activeHead(html)
  requireNative(head.titles.length === 1 && (url === HOME ? /^Home$/ : /^Job Search\s*\|\s*Lake Chemicals$/).test(head.titles[0]), 'employer page identity changed')
  const meta = property => head.metas.filter(row => row.property === property)
  requireNative(meta('og:site_name').length === 1 && meta('og:site_name')[0].content === 'Lake Chemicals', 'employer brand identity missing')
  requireNative(meta('og:url').length === 1 && meta('og:url')[0].content === (url === HOME ? HOME + 'home-1' : BOARD), 'employer canonical identity changed')
}

const inspectWorksites = (html, receipt) => {
  identity(html, HOME)
  const document = readVisibleNativeDocument(html, { strict: true })
  requireNative(document.nodes(node => node.tag === 'a' && node.attrs.href === '/job-search').length > 0, 'official job-search handoff missing')
  const byId = id => document.nodes(node => node.attrs['data-aid'] === id)
  const worksite = (headingId, addressId, heading, assignedLabel) => {
    const headings = byId(headingId), addresses = byId(addressId)
    if (headings.length !== 1 || addresses.length !== 1 || document.text(headings[0]) !== heading) return null
    const address = document.text(addresses[0])
    if (!assignedLabel.test(address) || !/\bKarnataka\s*\(India\)\.?$/.test(address) || foreignCountryName.test(address)) return null
    return { siteHeading: heading, nativeAddress: address, nativeAddressSha256: hash(address), addressId,
      country: 'India', sourceUrl: HOME, responseSha256: receipt.sha256 }
  }
  return {
    factory: worksite('CONTACT_INTRO_HEADING_REND', 'CONTACT_INTRO_DESC_REND', 'Manufacturing Site', /\bAttibele Industrial Area\b/),
    headOffice: worksite('CONTACT_INFO_BIZ_NAME_REND', 'CONTACT_INFO_ADDRESS_REND', 'Corporate Office', /\bShivaji\s*Nagar\b/),
  }
}

const inspectCards = html => {
  identity(html, BOARD)
  const document = readVisibleNativeDocument(html, { strict: true })
  const bodies = document.nodes(node => node.tag === 'body')
  requireNative(bodies.length === 1 && /we['’]re hiring!!/i.test(document.text(bodies[0])), 'current first-party hiring identity missing')
  const forms = document.nodes(node => node.tag === 'form' && node.attrs['data-ux'] === 'Form')
  requireNative(forms.length >= 1 && forms.some(node => /Attach Resume/.test(document.text(node)) && /Submit Application/.test(document.text(node))), 'current application form unavailable')
  const cards = document.nodes(node => node.attrs['data-ux'] === 'ContentCard')
  requireNative(cards.length > 0, 'no current native cards; empty inventory is unverified')
  const jobs = cards.map(card => {
    const headings = descendants(card, node => /^h[2-6]$/.test(node.tag) && /^CONTENT_HEADLINE\d+_RENDERED$/.test(node.attrs['data-aid'] || ''))
    const heading = exactlyOne(headings, 'native role heading'), number = heading.attrs['data-aid'].match(/\d+/)[0]
    const description = exactlyOne(descendants(card, node => node.attrs['data-aid'] === `CONTENT_DESCRIPTION${number}_RENDERED`), 'native role criteria')
    const title = document.text(heading), text = document.text(description)
    requireNative(title && text.length > 100 && /Qualification\s*:/.test(text) && /Experience\s*:/.test(text) && /Skills\s*:/.test(text), 'native full criteria are missing')
    const locations = [...text.matchAll(/\bLocation\s*:\s*([^]+?)(?=\b(?:Location|Qualification|Experience|Skills)\s*:|$)/gi)]
    requireNative(locations.length === 1 && locations[0][1].trim(), 'native role location is missing or ambiguous')
    const geographicFields = [...text.matchAll(/\b(Countr\w*|Countries|Worksite\w*|Workplace\w*|Office\w*|Region\w*|Residen\w*|Jurisdiction\w*|Additional\s*Locations?|Secondary\s*Locations?|Work\s*Locations?|Job\s*Locations?|Location\w*)[^:\n]{0,30}\s*:/gi)]
    const unknownGeographicFields = geographicFields.filter(match => {
      if (match[1].toLowerCase() === 'location') return false
      const rest = text.slice(match.index + match[0].length)
      const value = rest.match(/^([^]*?)(?=\b(?:Qualification|Experience|Skills|Location|Country)\s*:|$)/i)?.[1]?.trim()
      return !(/^country$/i.test(match[1]) && /^(?:India|IN|IND)$/i.test(value || ''))
    }).map(match => ({ label: match[0], context: text.slice(match.index, match.index + 180) }))
    return { title, jobId: `${SOURCE}-${slug(title)}`, nativeLocation: locations[0][1].trim(), sourceDescription: text, unknownGeographicFields,
      minimumQualification: text.match(/Qualification\s*:\s*(.*?)\s+Experience\s*:/i)?.[1] || null,
      experienceRequired: text.match(/Experience\s*:\s*(.*?)\s+Skills\s*:/i)?.[1] || null }
  })
  requireNative(new Set(jobs.map(job => job.jobId)).size === jobs.length, 'duplicate native role identity')
  const allHeadings = document.nodes(node => /^CONTENT_HEADLINE\d+_RENDERED$/.test(node.attrs['data-aid'] || ''))
  requireNative(allHeadings.length === jobs.length, 'unreconciled native role headings')
  return jobs
}

async function snapshot(url, options) {
  options.signal?.throwIfAborted()
  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000)
  const response = await fetch(url, { signal, redirect: 'error', headers: { Accept: 'text/html,application/xhtml+xml',
    'User-Agent': 'Mozilla/5.0 (compatible; Jobverify scraper)' } })
  requireNative(response.status === 200 && response.url === url, 'HTTP response status or observed URL mismatch')
  const html = await response.text()
  signal.throwIfAborted()
  requireNative(Buffer.byteLength(html) < 3000000, 'native page exceeded response size budget')
  return { html, receipt: { url, status: response.status, observedAt: new Date().toISOString(), sha256: hash(html) },
    scopeSignature: lakeExecutableScopeSignature(html) }
}

export async function runLakeCurrentInventory(options = {}) {
  options.signal?.throwIfAborted()
  requireNative(!options.fetchText && !options.fetchJson && !options.fetchImpl, 'HTTP response metadata required; body-only transports unsupported')
  requireNative(options.maxJobs == null && options.maxPages == null, 'inventory caps or page limits unsupported')
  const homepage = await snapshot(HOME, options), board = await snapshot(BOARD, options)
  const worksites = inspectWorksites(homepage.html, homepage.receipt), rawJobs = inspectCards(board.html)
  const closingHomepage = await snapshot(HOME, options), closingBoard = await snapshot(BOARD, options)
  const closingSites = inspectWorksites(closingHomepage.html, closingHomepage.receipt), closingJobs = inspectCards(closingBoard.html)
  const reasons = []
  for (const [name, opening, closing] of [['homepage', homepage, closingHomepage], ['board', board, closingBoard]]) {
    if (opening.scopeSignature !== reviewed[name] || closing.scopeSignature !== reviewed[name]) reasons.push(`unreviewed-${name}-hiring-surface`)
    if (opening.scopeSignature !== closing.scopeSignature) reasons.push(`${name}-hiring-surface-changed`)
  }
  requireNative(hash(rawJobs) === hash(closingJobs), 'native-role-inventory-or-full-criteria-changed')
  requireNative(hash(Object.values(worksites).map(site => site?.nativeAddress || null)) === hash(Object.values(closingSites).map(site => site?.nativeAddress || null)), 'native-assigned-worksite-addresses-changed')
  const unknownCountryRoles = [], knownJobs = []
  for (const raw of rawJobs) {
    const site = raw.nativeLocation === 'Attibele (Factory)' ? worksites.factory
      : raw.nativeLocation === 'Shivajinagar (Head Office)' ? worksites.headOffice : null
    if (!site || raw.unknownGeographicFields.length) { unknownCountryRoles.push({ ...raw, country: null, reason: 'role-assigned-named-worksite-country-unresolved' }); continue }
    const proof = { method: 'role-assigned-named-worksite-to-current-employer-address', roleLocation: raw.nativeLocation, ...site }
    knownJobs.push({ ...raw, source: SOURCE, company: 'Lake Chemicals Pvt. Ltd', requisitionId: raw.jobId,
      location: raw.nativeLocation, city: null, country: 'India', sourceUrl: BOARD, applyUrl: BOARD, link: BOARD,
      companyCareerPage: BOARD, companyDomain: 'lakechemicals.com', atsPlatform: 'official-company-careers',
      jobDescription: raw.sourceDescription, sourceWorksiteCountryProof: proof, sourceDetailComplete: true,
      postingDate: null, closingDate: null, scrapedAt: (options.now || (() => new Date().toISOString()))() })
  }
  if (unknownCountryRoles.length) reasons.push(`unresolved-native-role-country:${unknownCountryRoles.map(job => job.jobId).join(',')}`)
  const complete = reasons.length === 0
  const jobs = knownJobs.map(job => ({ ...job, sourceListingComplete: complete, sourceScopeComplete: complete, lifecycleCleanupAllowed: complete,
    sourceUnresolvedNativeRoles: unknownCountryRoles }))
  const audit = { source: SOURCE, productionWrites: false, complete, reasons, nativeCount: rawJobs.length, returnedIndiaJobs: jobs.length,
    openingHomepage: homepage.receipt, openingBoard: board.receipt, closingHomepage: closingHomepage.receipt, closingBoard: closingBoard.receipt,
    openingInventorySignature: hash(rawJobs), closingInventorySignature: hash(closingJobs), worksites, unknownCountryRoles,
    nativeRoles: rawJobs.map(job => ({ jobId: job.jobId, title: job.title, nativeLocation: job.nativeLocation, sourceDescriptionSha256: hash(job.sourceDescription) })) }
  options.onAudit?.(structuredClone(audit))
  options.signal?.throwIfAborted()
  return attachInventoryEvidence(jobs, { status: complete ? 'complete-inventory' : 'coverage-gap', firstParty: true, surface: BOARD,
    listingComplete: complete, pagesFetched: 4, reportedTotal: complete ? rawJobs.length : null, indiaFacetCount: complete ? jobs.length : null,
    verifiedAt: new Date().toISOString(), reason: complete ? 'current-native-cards-full-criteria-and-role-assigned-country-reconciled'
      : `lake-source-incomplete:${reasons.join(';')}` })
}
