import { createHash } from 'node:crypto'
import { decodeNativeEntities, readNativeDocument } from '../utils/activeNativeHtml.js'

export const WORKDAY_COUNTRY_INVENTORY_PROOF = Symbol.for('jobverify.workday.country-inventory-proof')
export const hashWorkdayProof = body => createHash('sha256').update(body).digest('hex')

const boardKey = value => {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    const parts = url.pathname.split('/').filter(Boolean).filter(part => !/^[a-z]{2}-[a-z]{2}$/i.test(part))
    if (/^[^.]+\.wd\d+\.myworkdayjobs\.com$/i.test(url.hostname) && parts.length === 1) return url.origin + '/' + parts[0]
    if (/\.myworkdaysite\.com$/i.test(url.hostname) && parts.length === 3 && parts[0] === 'recruiting') return url.origin + '/' + parts.join('/')
  } catch { /* Invalid URLs cannot bind a board. */ }
  return null
}

// The shared native tree reader excludes raw-text, template and fallback
// markup. Additional activity checks apply to anchors and their ancestors.
export const currentWorkdayBoardReceipt = ({ officialCareersUrl, boardUrl, response, html }) => {
  const requested = new URL(officialCareersUrl), actual = new URL(response.url)
  const contentType = response.headers?.get?.('content-type') || ''
  if (!response.ok || requested.protocol !== 'https:' || actual.protocol !== 'https:'
    || requested.username || requested.password || actual.username || actual.password
    || actual.origin !== requested.origin || actual.pathname.replace(/\/$/, '') !== requested.pathname.replace(/\/$/, '')
    || actual.search !== requested.search || actual.hash || !/^(?:text\/html|application\/xhtml\+xml)(?:\s*;|$)/i.test(contentType)) {
    throw new Error('Current corporate careers response has an invalid status, URL, or HTML content type')
  }
  const expected = boardKey(boardUrl)
  if (!expected) throw new Error('Expected Workday board identity is invalid')
  const inactiveStyle = /(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|content-visibility\s*:\s*hidden|opacity\s*:\s*0(?:\D|$))/i
  const hiddenSelectors = [...String(html).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)]
    .flatMap(([, css]) => [...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)]
      .filter(([, , declarations]) => inactiveStyle.test(declarations))
      .flatMap(([, selectors]) => selectors.split(',')))
  const hiddenByStylesheet = (tag, attrs) => hiddenSelectors.some(selector => {
    // Conservatively reject any element named by a hiding selector, including
    // conditional and descendant selectors; proof can tolerate false negatives.
    const ids = [...selector.matchAll(/#([\w-]+)/g)].map(([, id]) => id)
    const classes = [...selector.matchAll(/\.([\w-]+)/g)].map(([, name]) => name)
    const ownClasses = (attrs.class || '').split(/\s+/)
    return ids.includes(attrs.id) || classes.some(name => ownClasses.includes(name))
      || new RegExp('(?:^|[\\s>+~])' + tag + '(?=[\\s.#:[>+~]|$)', 'i').test(selector.trim())
      || selector.trim() === '*'
  })
  const document = readNativeDocument(html)
  const anchorUrls = []
  const visibleText = node => {
    if (typeof node === 'string') return decodeNativeEntities(node)
    const { tag, attrs } = node
    const blocked = node.inert || ['script', 'style', 'head', 'svg'].includes(tag)
      || ['hidden', 'inert', 'disabled'].some(key => Object.hasOwn(attrs, key))
      || ['aria-hidden', 'aria-disabled'].some(key => Object.hasOwn(attrs, key) && attrs[key].toLowerCase() !== 'false')
      || /(?:^|\s)(?:hidden|invisible|sr-only)(?:\s|$)/i.test(attrs.class || '')
      || inactiveStyle.test((attrs.style || '').replace(/\/\*[\s\S]*?\*\//g, ''))
      || hiddenByStylesheet(tag, attrs)
    if (blocked) return ''
    const text = node.children.map(visibleText).join(' ')
    if (tag === 'a' && attrs.href && text.trim()) {
      try {
        const href = new URL(attrs.href, actual)
        if (boardKey(href.href) === expected) anchorUrls.push(href.href)
      } catch { /* An invalid anchor is not a handoff. */ }
    }
    return text
  }
  for (const root of document.nodes(node => node.tag === 'root')) visibleText(root)
  if (!anchorUrls.length) throw new Error('Current corporate careers HTML has no active anchor to the exact Workday board')
  return { requestedUrl: requested.href, responseUrl: actual.href,
    status: response.status, contentType, board: expected, anchorUrl: anchorUrls[0],
    sha256: hashWorkdayProof(html), fetchedAt: new Date().toISOString() }
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
const countries = new Map()
for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
  const code = String.fromCharCode(a, b), name = regionNames.of(code)
  if (name && name !== code && !['ZZ', 'EU', 'UN', 'XA', 'XB', 'QO'].includes(code)) {
    // DisplayNames accepts aliases such as UK. Compare their canonical region
    // codes so the alias cannot overwrite United Kingdom with a spurious UK/GB
    // disagreement in an otherwise consistent native country object.
    const canonicalCode = new Intl.Locale('und-' + code).region
    countries.set(code.toLowerCase(), canonicalCode)
    countries.set(name.toLowerCase(), canonicalCode)
  }
}
for (const [name, code] of Object.entries({ IND: 'IN', USA: 'US', 'United States of America': 'US', UK: 'GB', UAE: 'AE' })) countries.set(name.toLowerCase(), code)

// Only an explicit country token proves scope here. City names and punctuation
// alone never prove a foreign country, nor do broad regional/remote labels.
export const explicitWorkdayCountryScope = value => {
  const label = String(value || '').trim()
  if (!label || /[;/|+&]|\b(?:or|and|global|worldwide|anywhere|APAC|EMEA|LATAM)\b/i.test(label)) return null
  const prefix = label.match(/^([A-Z]{2,3})[.\-,]\s*/)?.[1]
  const suffix = label.match(/,\s*([^,]+)$/)?.[1]
  const explicitCountries = [countries.get(label.toLowerCase()),
    countries.get(label.replace(/\s+remote$/i, '').toLowerCase()),
    prefix && countries.get(prefix.toLowerCase()), suffix && countries.get(suffix.toLowerCase())].filter(Boolean)
  if (new Set(explicitCountries).size !== 1) return null
  const country = explicitCountries[0]
  if (/\bindia\b/i.test(label) && country !== 'IN') return null
  return country ? country === 'IN' ? 'india' : 'foreign' : null
}

export const hasRecognizedWorkdayCountry = country => {
  const values = (typeof country === 'string' ? [country] : [country?.descriptor, country?.alpha2Code])
    .filter(value => typeof value === 'string' && value.trim())
  const codes = values.map(value => countries.get(value.trim().toLowerCase()))
  return codes.length > 0 && codes.every(Boolean) && new Set(codes).size === 1
}

export const workdayInventoryIdentity = job => JSON.stringify([
  job.externalPath, job.title, job.bulletFields || [], job.locationsText || null,
])
