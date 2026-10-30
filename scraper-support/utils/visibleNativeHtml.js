import { readNativeDocument } from './activeNativeHtml.js'

const hiddenStyle = value => /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|content-visibility\s*:\s*hidden|opacity\s*:\s*[+-]?(?:0(?:\.0*)?|\.0+)(?:e[+-]?\d+)?%?)(?:\s*!important)?\s*(?:;|$)/i.test(value || '')

const selectorList = value => {
  const selectors = []
  let start = 0, depth = 0, quote = ''
  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (char === '\\') { i++; continue }
    if (quote) { if (char === quote) quote = ''; continue }
    if (char === '"' || char === "'") quote = char
    else if (char === '[' || char === '(') depth++
    else if (char === ']' || char === ')') depth--
    else if (char === ',' && !depth) { selectors.push(value.slice(start, i).trim()); start = i + 1 }
  }
  selectors.push(value.slice(start).trim())
  return selectors.filter(selector => selector && !/^\d+(?:\.\d+)?%$/.test(selector))
}

const targetsPseudoElement = value => {
  let depth = 0, quote = ''
  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (char === '\\') { i++; continue }
    if (quote) { if (char === quote) quote = ''; continue }
    if (char === '"' || char === "'") quote = char
    else if (char === '[' || char === '(') depth++
    else if (char === ']' || char === ')') depth--
    else if (!depth && char === ':' && /^(?:::|:(?:before|after|first-line|first-letter)(?![\w-]))/i.test(value.slice(i))) return true
  }
  return false
}
// Split only at top-level combinators: spaces inside attributes and pseudo
// functions are part of a compound. Conditional pseudo classes can hide a
// matching element, so they remain conservative rather than proving visibility.
const selectorParts = selector => {
  const parts = [], combinators = []
  let start = 0, depth = 0, quote = '', pending = ' '
  const flush = end => { const part = selector.slice(start, end).trim(); if (part) { if (parts.length) combinators.push(pending); parts.push(part); pending = ' ' } }
  for (let i = 0; i < selector.length; i++) {
    const char = selector[i]
    if (quote) { if (char === quote && selector[i - 1] !== '\\') quote = ''; continue }
    if (char === '"' || char === "'") { quote = char; continue }
    if (char === '[' || char === '(') depth++
    else if (char === ']' || char === ')') depth--
    else if (!depth && /[\s>+~]/.test(char)) { flush(i); if (!/\s/.test(char)) pending = char; start = i + 1 }
  }
  flush(selector.length)
  return { parts, combinators }
}
const compoundMatches = (node, compound, ancestor = false, strict = false) => {
  if (strict && targetsPseudoElement(compound)) return false
  // An unsupported constraint cannot prove that a hiding rule is
  // inapplicable. Keep its known prefix (e.g. .header in .header:hover) and
  // conservatively allow the remaining condition, as for conditional styles.
  const attributeSelector = /\[\s*([\w-]+)\s*(?:(=|~=|\|=|\^=|\$=|\*=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+))\s*)?(?:[iIsS]\s*)?\]/g
  const attributes = [...compound.matchAll(attributeSelector)].filter(([, name, operator]) => strict || name.toLowerCase() === 'id' && operator === '=')
  const withoutAttributes = strict ? compound.replace(attributeSelector, '')
    : compound.replace(/\[id\s*=\s*(?:"[^"]*"|'[^']*'|[^\]]+)\]/gi, '')
  const knownCompound = !compound.includes('\\') && /^(?:[a-z][\w-]*|\*)?(?:[.#][\w-]+)*$/i.test(withoutAttributes)
  if ((ancestor || strict) && !knownCompound) {
    // Escapes, namespaces and non-ASCII identifiers cannot be truncated into
    // literal class/tag names: the resulting prefix would mean another token.
    if (/[\\|]|[^\x00-\x7f]/.test(compound)) return true
    const prefix = compound.match(/^(?:[a-z][\w-]*|\*)?(?:[.#][\w-]+)*/i)?.[0]
    return prefix ? compoundMatches(node, prefix, false, strict) : true
  }
  // Keep the reader's existing tag/id/class vocabulary. This repairs scope;
  // it does not expand static CSS evaluation into runtime hydration rules.
  const vocabulary = strict ? withoutAttributes : compound
  const tag = vocabulary.match(/^[a-z][\w-]*/i)?.[0], ids = [...vocabulary.matchAll(/#([\w-]+)/g)].map(m => m[1])
  const classes = [...vocabulary.matchAll(/\.([\w-]+)/g)].map(m => m[1])
  if (compound === '*') return true
  if (!tag && !ids.length && !classes.length && !attributes.length) return false
  return (!tag || node.tag === tag.toLowerCase()) && ids.every(id => node.attrs.id === id)
    && attributes.every(([, name, operator, doubleQuoted, singleQuoted, unquoted]) => {
      const key = name.toLowerCase(), expected = doubleQuoted ?? singleQuoted ?? unquoted
      // Case-insensitive comparison is conservative for a hiding rule even on
      // HTML attributes whose actual matching may be case-sensitive.
      if (!Object.hasOwn(node.attrs, key)) return false
      if (!operator) return true
      const actual = node.attrs[key].toLowerCase(), value = expected.toLowerCase()
      if (operator === '=') return actual === value
      if (operator === '~=') return value !== '' && actual.split(/\s+/).includes(value)
      if (operator === '|=') return actual === value || actual.startsWith(value + '-')
      if (!value) return false
      if (operator === '^=') return actual.startsWith(value)
      if (operator === '$=') return actual.endsWith(value)
      return actual.includes(value)
    })
    && classes.every(name => (node.attrs.class || '').split(/\s+/).includes(name))
}
const matches = (node, { parts, combinators }, parents, strict) => {
  const test = (current, index) => {
    if (!current || !compoundMatches(current, parts[index], index < parts.length - 1, strict)) return false
    if (!index) return true
    const parent = parents.get(current), combinator = combinators[index - 1]
    if (combinator === '>') return test(parent, index - 1)
    if (combinator === '+' || combinator === '~') {
      const siblings = parent?.children.filter(child => typeof child !== 'string') || [], before = siblings.slice(0, siblings.indexOf(current))
      return combinator === '+' ? test(before.at(-1), index - 1) : before.some(sibling => test(sibling, index - 1))
    }
    for (let ancestor = parent; ancestor; ancestor = parents.get(ancestor)) if (test(ancestor, index - 1)) return true
    return false
  }
  return parts.length > 0 && test(node, parts.length - 1)
}

// Extend the static native tree with conservative stylesheet/opacity visibility.
// Conditional hiding rules count as hidden evidence; scripts are never executed.
export const readVisibleNativeDocument = (html, { strict = false } = {}) => {
  const document = readNativeDocument(html)
  const selectors = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].flatMap(([, css]) =>
    [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]+)\}/g)]
      .filter(([, , declarations]) => hiddenStyle(declarations)).flatMap(([, list]) => strict ? selectorList(list) : list.split(','))).map(selectorParts)
  const parents = new Map()
  const indexParents = node => { for (const child of node.children || []) if (typeof child !== 'string') { parents.set(child, node); indexParents(child) } }
  document.nodes(node => node.tag === 'root').forEach(indexParents)
  const project = (node, active = true) => {
    if (typeof node === 'string') return node
    const visible = active && !hiddenStyle((node.attrs.style || '').replace(/\/\*[\s\S]*?\*\//g, ''))
      && !selectors.some(selector => matches(node, selector, parents, strict))
    const activeFrame = node.activeFrame === true && visible
    active = visible && !node.inert
    return { ...node, activeFrame, inert: !active, children: node.children.map(child => project(child, active)) }
  }
  const roots = document.nodes(node => node.tag === 'root').map(root => project(root))
  const find = (node, predicate) => node.inert ? [] : [ ...(predicate(node) ? [node] : []),
    ...node.children.filter(child => typeof child !== 'string').flatMap(child => find(child, predicate)) ]
  // Visible frames may initially have no src; their fallback remains inert.
  const frames = node => node.activeFrame ? [node] : node.inert ? []
    : node.children.filter(child => typeof child !== 'string').flatMap(frames)
  return { ...document, nodes: predicate => roots.flatMap(root => find(root, predicate)), frames: () => roots.flatMap(frames) }
}
