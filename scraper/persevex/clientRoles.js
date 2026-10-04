export const contractFailure = message => Object.assign(new Error(message), { code: 'PERSEVEX_CONTRACT_CHANGED', softFailure: true, failureKind: 'upstream_contract_changed', abortRetries: true })

// Only the published static data literal is read; no JavaScript is executed.
class LiteralReader {
  constructor(text, offset) { this.text = text; this.offset = offset }
  skip() { while (/\s/.test(this.text[this.offset] || '')) this.offset++ }
  expect(char) { this.skip(); if (this.text[this.offset++] !== char) throw contractFailure('Persevex malformed client data literal') }
  string() {
    this.skip()
    const start = this.offset
    if (this.text[this.offset++] !== '"') throw contractFailure('Persevex invalid client string literal')
    let escaped = false
    while (this.offset < this.text.length) {
      const char = this.text[this.offset++]
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') { try { return JSON.parse(this.text.slice(start, this.offset)) } catch { throw contractFailure('Persevex malformed client string literal') } }
    }
    throw contractFailure('Persevex unterminated client string literal')
  }
  value(depth = 0) {
    if (depth > 5) throw contractFailure('Persevex malformed client literal depth')
    this.skip()
    const char = this.text[this.offset]
    if (char === '"') return this.string()
    if (char === '[') {
      this.offset++
      const array = []
      this.skip()
      if (this.text[this.offset] === ']') { this.offset++; return array }
      while (true) {
        array.push(this.value(depth + 1))
        this.skip()
        if (this.text[this.offset] === ']') { this.offset++; return array }
        this.expect(',')
        if (array.length > 200) throw contractFailure('Persevex oversized client array')
      }
    }
    if (char === '{') {
      this.offset++
      const object = Object.create(null)
      const keys = new Set()
      while (true) {
        this.skip()
        if (this.text[this.offset] === '}') { this.offset++; return object }
        let key
        if (this.text[this.offset] === '"') key = this.string()
        else {
          const match = this.text.slice(this.offset).match(/^[A-Za-z_$][\w$]*/)
          if (!match) throw contractFailure('Persevex malformed client object key')
          key = match[0]; this.offset += key.length
        }
        if (keys.has(key)) throw contractFailure('Persevex duplicate client role property')
        keys.add(key)
        this.expect(':')
        object[key] = this.value(depth + 1)
        this.skip()
        if (this.text[this.offset] === '}') { this.offset++; return object }
        this.expect(',')
      }
    }
    throw contractFailure('Persevex invalid non-static client data literal')
  }
}

export const extractClientRoles = value => {
  const client = String(value ?? '')
  if (!client) throw contractFailure('Persevex published careers client is required')
  const bindings = [
    'M=C.filter', 'E=M.reduce', 'children:M.length', 'children:E[e].map',
    'S,{position:e,index:t,onApply:(e,t)=>{u({title:e,id:t}),l(!0)}',
    'children:t.description', 'children:t.requirements.map', 'onClick:()=>o(t.title,t.id)',
    'jobTitle:d.title,jobId:d.id',
    'fetch("/api/applications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...u,jobTitle:c,jobId:m,timestamp:',
  ]
  if (!bindings.every(binding => client.includes(binding))) throw contractFailure('Persevex published client detail/application binding changed')
  const matches = [...client.matchAll(/\bC=\[/g)]
  if (matches.length !== 1) throw contractFailure('Persevex ambiguous published client role-array binding')
  const reader = new LiteralReader(client, matches[0].index + 2)
  const roles = reader.value()
  if (!/^;function S\(/.test(client.slice(reader.offset))) throw contractFailure('Persevex malformed client role-array binding')
  if (!roles.length) throw contractFailure('Persevex zero inventory has no verified explicit empty-opening statement')
  const ids = new Set(), titles = new Set()
  const allowed = new Set(['id', 'title', 'department', 'type', 'location', 'stipend', 'description', 'requirements'])
  for (const role of roles) {
    if (!role || Array.isArray(role) || Object.keys(role).some(key => !allowed.has(key))) throw contractFailure('Persevex invalid published role schema')
    for (const key of ['id', 'title', 'department', 'type', 'location', 'description']) {
      if (typeof role[key] !== 'string' || !role[key].trim()) throw contractFailure('Persevex invalid published role ' + key)
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(role.id)) throw contractFailure('Persevex invalid published role identity')
    if (!Array.isArray(role.requirements) || !role.requirements.length || role.requirements.some(text => typeof text !== 'string' || !text.trim())) throw contractFailure('Persevex invalid published role requirements')
    if (role.stipend != null && (typeof role.stipend !== 'string' || !role.stipend.trim())) throw contractFailure('Persevex invalid published role stipend')
    if (ids.has(role.id) || titles.has(role.title)) throw contractFailure('Persevex duplicate published role identity')
    ids.add(role.id); titles.add(role.title)
  }
  return roles
}
