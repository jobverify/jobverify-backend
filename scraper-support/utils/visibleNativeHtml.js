import { readNativeDocument } from './activeNativeHtml.js'

const hiddenStyle = value => /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|content-visibility\s*:\s*hidden|opacity\s*:\s*0(?:\.0+)?)(?:\s*!important)?\s*(?:;|$)/i.test(value || '')
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
const compoundMatches = (node, compound, ancestor = false) => {
  // An unsupported ancestor constraint cannot prove that a hiding rule is
  // inapplicable. Keep its known prefix (e.g. .header in .header:hover) and
  // conservatively allow the remaining condition, as for conditional styles.
  const withoutKnownId = compound.replace(/\[id\s*=\s*(?:"[^"]*"|'[^']*'|[^\]]+)\]/gi, '')
  const knownCompound = /^(?:[a-z][\w-]*|\*)?(?:[.#][\w-]+)*$/i.test(withoutKnownId)
  if (ancestor && !knownCompound) {
    // Escapes, namespaces and non-ASCII identifiers cannot be truncated into
    // literal class/tag names: the resulting prefix would mean another token.
    if (/[\\|]|[^\x00-\x7f]/.test(compound)) return true
    const prefix = compound.match(/^(?:[a-z][\w-]*|\*)?(?:[.#][\w-]+)*/i)?.[0]
    return prefix ? compoundMatches(node, prefix) : true
  }
  // Keep the reader's existing tag/id/class vocabulary. This repairs scope;
  // it does not expand static CSS evaluation into runtime hydration rules.
  const tag = compound.match(/^[a-z][\w-]*/i)?.[0], ids = [...compound.matchAll(/#([\w-]+)/g)].map(m => m[1])
  const classes = [...compound.matchAll(/\.([\w-]+)/g)].map(m => m[1])
  const attributeId = compound.match(/\[id\s*=\s*["']?([^\]"']+)["']?\]/i)?.[1]
  if (compound === '*') return true
  if (!tag && !ids.length && !classes.length && !attributeId) return false
  return (!tag || node.tag === tag.toLowerCase()) && ids.every(id => node.attrs.id === id)
    && (!attributeId || node.attrs.id === attributeId)
    && classes.every(name => (node.attrs.class || '').split(/\s+/).includes(name))
}
const matches = (node, { parts, combinators }, parents) => {
  const test = (current, index) => {
    if (!current || !compoundMatches(current, parts[index], index < parts.length - 1)) return false
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
export const readVisibleNativeDocument = html => {
  const document = readNativeDocument(html)
  const selectors = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].flatMap(([, css]) =>
    [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]+)\}/g)]
      .filter(([, , declarations]) => hiddenStyle(declarations)).flatMap(([, list]) => list.split(','))).map(selectorParts)
  const parents = new Map()
  const indexParents = node => { for (const child of node.children || []) if (typeof child !== 'string') { parents.set(child, node); indexParents(child) } }
  document.nodes(node => node.tag === 'root').forEach(indexParents)
  const project = (node, active = true) => {
    if (typeof node === 'string') return node
    const visible = active && !hiddenStyle((node.attrs.style || '').replace(/\/\*[\s\S]*?\*\//g, ''))
      && !selectors.some(selector => matches(node, selector, parents))
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
