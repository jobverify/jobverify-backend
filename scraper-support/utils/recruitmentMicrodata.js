import { nativeCountryName } from '../shared/nativeJobPosting.js'

// Read only active, own-scope HTML microdata. Nested organizations or unrelated
// postings cannot donate country, employer or title fields to another role.
export function recruitmentMicrodataPostings(document, pageURL) {
  const scopes = document.nodes(node => Object.hasOwn(node.attrs, 'itemscope')
    && (node.attrs.itemtype || '').split(/\s+/).some(type => /^https?:\/\/schema\.org\/JobPosting\/?$/.test(type)))
  return scopes.map(scope => {
    const issues = new Set()
    const properties = (name, root = scope) => {
      const found = []
      const visit = parent => {
        for (const child of parent.children) {
          if (typeof child === 'string' || child.inert) continue
          if ((child.attrs.itemprop || '').split(/\s+/).includes(name)) found.push(child)
          if (!Object.hasOwn(child.attrs, 'itemscope')) visit(child)
        }
      }
      visit(root)
      return found
    }
    const value = node => node.attrs.content ?? (node.tag === 'a' || node.tag === 'link' ? node.attrs.href : null) ?? document.text(node)
    const scalar = (name, root = scope) => {
      const values = [...new Set(properties(name, root).map(value).filter(item => typeof item === 'string' && item.trim()).map(item => item.trim()))]
      if (values.length > 1) issues.add('ambiguous-native-microdata-' + name)
      return values.length === 1 ? values[0] : null
    }
    const organizations = properties('hiringOrganization').map(node => Object.hasOwn(node.attrs, 'itemscope') ? scalar('name', node) : value(node)).filter(Boolean)
    if (new Set(organizations).size > 1) issues.add('ambiguous-native-microdata-employer')
    const title = scalar('title')
    const descriptions = [...new Set(properties('description').filter(node => !['meta', 'script'].includes(node.tag)).map(node => document.text(node)).filter(Boolean))]
    if (descriptions.length > 1) issues.add('ambiguous-native-microdata-description')
    const locations = properties('jobLocation').flatMap(place => properties('address', place)).map(address => ({
      address: Object.fromEntries(['addressLocality', 'addressRegion', 'addressCountry', 'postalCode', 'streetAddress'].map(name => [name, scalar(name, address)])),
    }))
    const visibleLocations = []
    const visitLocations = parent => {
      for (const child of parent.children) {
        if (typeof child === 'string' || child.inert || Object.hasOwn(child.attrs, 'itemscope')) continue
        if ((child.attrs.class || '').split(/\s+/).includes('jobGeoLocation')) visibleLocations.push(document.text(child))
        visitLocations(child)
      }
    }
    visitLocations(scope)
    // RMK sometimes writes the first two letters of a country name into its
    // microdata, including "In" for Indonesia. Correlate its own full visible
    // worksite label before interpreting those letters as an ISO country code.
    if (visibleLocations.length) for (const location of locations) {
      const address = location.address, original = address.addressCountry
      const labels = [...new Set(visibleLocations)].filter(label => address.addressLocality
        && label.toLowerCase().startsWith(address.addressLocality.toLowerCase() + ','))
      const countries = [...new Set(labels.map(label => {
        const parts = label.split(',').map(part => part.trim())
        const tail = parts.at(-1)
        return nativeCountryName(tail)
          || (/\d/.test(tail || '') ? nativeCountryName(parts.at(-2)) : null)
      }).filter(Boolean))]
      if (countries.length !== 1) { issues.add('native-microdata-visible-country-unresolved'); continue }
      const resolved = countries[0]
      if (nativeCountryName(original) !== resolved
        && !(typeof original === 'string' && /^[a-z]{2}$/i.test(original) && resolved.toLowerCase().startsWith(original.toLowerCase()))) {
        issues.add('native-microdata-country-conflict'); continue
      }
      address.nativeAddressCountry = original
      address.addressCountry = resolved
    }
    const url = scalar('url') || scope.attrs.itemid || pageURL
    const datePosted = scalar('datePosted'), validThrough = scalar('validThrough'), employmentType = scalar('employmentType')
    return { '@type': 'JobPosting', nativeRepresentation: 'html-microdata', nativeMicrodataIssues: [...issues],
      nativeVisibleTitleConfirmed: properties('title').some(node => !['meta', 'link'].includes(node.tag) && document.text(node) === title),
      title, description: descriptions.length === 1 ? descriptions[0] : null,
      url,
      hiringOrganization: new Set(organizations).size === 1 ? { name: organizations[0] } : null,
      jobLocation: locations, datePosted, validThrough, employmentType }
  })
}
