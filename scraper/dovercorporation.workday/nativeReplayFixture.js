// Test/offline evidence transport only. Production never imports this module.
import fs from 'node:fs'
import assert from 'node:assert/strict'

export const CAPTURE_ROOT = new URL('../../../artifacts/full-catalog/dover-native-001/native-offices-009/', import.meta.url)
export function nativePackets() {
  return Array.from({length:52}, (_,i)=>JSON.parse(fs.readFileSync(new URL(String(i+1).padStart(3,'0')+'.json',CAPTURE_ROOT),'utf8')))
}
export function replayTransport(packets=nativePackets(), mutate=()=>{}) {
  let index=0
  const calls=[]
  return {calls, get consumed(){return index}, async fetch(url, options={}) {
    const packet=structuredClone(packets[index++])
    assert.ok(packet, 'Unexpected request after recorded packets')
    assert.equal(String(url),packet.url)
    assert.equal(options.method??'GET',packet.method)
    if(packet.requestBody) assert.deepEqual(JSON.parse(options.body),packet.requestBody)
    mutate(packet,index)
    calls.push({url:String(url),method:options.method??'GET',accept:options.headers?.Accept})
    return {status:packet.status,url:packet.finalURL,headers:new Headers(),text:async()=>packet.body}
  }}
}
