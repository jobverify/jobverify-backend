import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'

import { extractEmbeddedJobListings } from '../../scraper/avantel/script.js'
import { parseJobsBundle } from '../../scraper/celebaltechnologies/script.js'
import { extractEmbeddedJobs } from '../../scraper/immidarttechnologiesllp/script.js'
import { extractJobsFromAssetText } from '../../scraper/nousinfosystems/script.js'
import { extractSucuriCookie } from '../../scraper/onwardtechnologies/script.js'

const withGlobalFlag = (name, callback) => {
  delete globalThis[name]
  try {
    callback(name)
    assert.equal(globalThis[name], undefined)
  } finally {
    delete globalThis[name]
  }
}

test('Celebal jobs bundle parser rejects executable expressions as data', () => {
  withGlobalFlag('__jobverifyCelebalLiteralExecuted', (flag) => {
    const bundle = `let roles=[{id:"data-scientist-fresher",title:"Data Scientist",location:"Jaipur",skills:(globalThis.${flag}=true,[])}];`

    assert.throws(
      () => parseJobsBundle(bundle),
      /literal|parse|schema|unsupported/i,
    )
  })
})

test('Immidart jobs bundle parser rejects executable expressions as data', () => {
  withGlobalFlag('__jobverifyImmidartLiteralExecuted', (flag) => {
    const bundle = `const $3=[{id:"role-1",title:"Engineer",location:"Pune",experience:"0-1 years",positions:1,department:"Engineering",description:"Build products",responsibilities:(globalThis.${flag}=true,[]),requirements:[]}];`

    assert.throws(
      () => extractEmbeddedJobs(bundle),
      /literal|parse|payload|unsupported/i,
    )
  })
})

test('Nous Infosystems jobs asset parser rejects executable expressions as data', () => {
  withGlobalFlag('__jobverifyNousLiteralExecuted', (flag) => {
    const asset = `const jobs=[{slug:"java-developer",title:"Java Developer",team:"Engineering",location:"Pune",openings:1,type:"Full time",experience:"1 year",skills:(globalThis.${flag}=true,[]),description:[]}]; export {jobs};`

    assert.throws(
      () => extractJobsFromAssetText(asset),
      /literal|parse|array|unsupported/i,
    )
  })
})

test('Onward Sucuri challenge evaluation supplies a hard vm timeout', () => {
  const originalRunInContext = vm.runInContext
  let receivedOptions = null

  vm.runInContext = (_source, context, options) => {
    receivedOptions = options
    context.document.cookie = 'sucuri_cloudproxy_uuid_test=value'
  }

  try {
    assert.equal(
      extractSucuriCookie('<script>document.cookie="sucuri_cloudproxy_uuid_test=value"</script>'),
      'sucuri_cloudproxy_uuid_test=value',
    )
    assert.equal(receivedOptions?.timeout, 1000)
  } finally {
    vm.runInContext = originalRunInContext
  }
})

test('Avantel embedded listings evaluation supplies a hard vm timeout', () => {
  const originalRunInNewContext = vm.runInNewContext
  let receivedOptions = null

  vm.runInNewContext = (_source, _sandbox, options) => {
    receivedOptions = options
    return [{
      id: 1,
      role: 'Embedded Senior Engineer',
      location: 'Hyderabad',
      city: 'Hyderabad',
      skills: [],
      responsibilities: [],
      preferable: [],
    }]
  }

  try {
    const listings = extractEmbeddedJobListings('jobListings:[{id:1,role:"Embedded Senior Engineer",location:"Hyderabad",city:"Hyderabad"}]')
    assert.equal(listings.length, 1)
    assert.equal(receivedOptions?.timeout, 1000)
  } finally {
    vm.runInNewContext = originalRunInNewContext
  }
})
