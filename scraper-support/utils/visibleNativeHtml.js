import { readNativeDocument } from './activeNativeHtml.js'

const hiddenStyle = value => /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|content-visibility\s*:\s*hidden|opacity\s*:\s*0(?:\.0+)?)(?:\s*!important)?\s*(?:;|$)/i.test(value || '')
const matches = (node, selector) => {
  const compound = selector.trim().split(/[\s>+~]+/).at(-1)
  if (compound === '*') return true
  const tag = compound.match(/^[a-z][\w-]*/i)?.[0], ids = [...compound.matchAll(/#([\w-]+)/g)].map(m => m[1])
  const classes = [...compound.matchAll(/\.([\w-]+)/g)].map(m => m[1])
  const attributeId = compound.match(/\[id\s*=\s*["']?([^\]"']+)["']?\]/i)?.[1]
  if (!tag && !ids.length && !classes.length && !attributeId) return false
  return (!tag || node.tag === tag.toLowerCase()) && ids.every(id => node.attrs.id === id)
    && (!attributeId || node.attrs.id === attributeId)
    && classes.every(name => (node.attrs.class || '').split(/\s+/).includes(name))
}

// Extend the static native tree with conservative stylesheet/opacity visibility.
// Conditional hiding rules count as hidden evidence; scripts are never executed.
export const readVisibleNativeDocument = html => {
  const document = readNativeDocument(html)
  const selectors = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].flatMap(([, css]) =>
    [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]+)\}/g)]
      .filter(([, , declarations]) => hiddenStyle(declarations)).flatMap(([, list]) => list.split(',')))
  const project = (node, active = true) => {
    if (typeof node === 'string') return node
    const visible = active && !hiddenStyle((node.attrs.style || '').replace(/\/\*[\s\S]*?\*\//g, ''))
      && !selectors.some(selector => matches(node, selector))
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
