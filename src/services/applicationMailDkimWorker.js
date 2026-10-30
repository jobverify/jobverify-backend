import { parentPort, workerData } from 'node:worker_threads';
import { Resolver } from 'node:dns/promises';
import { createRequire } from 'node:module';

// Kept isolated from database modules and credentials. The parent bounds total
// CPU/wall time and heap, and terminates this worker on every completion path.
try {
  const require = createRequire(import.meta.url);
  if (require('mailauth/package.json').version !== '8.0.4') throw Object.assign(new Error(), { code: 'MODULE_NOT_FOUND' });
  const { dkimVerify } = require('mailauth/lib/dkim/verify');
  const dns = new Resolver({ timeout: 700, tries: 1 });
  let calls = 0;
  try {
    const result = await dkimVerify(Buffer.from(workerData.bytes), { strict: true, minBitLength: 2048, rejectRsaSha1: true,
      resolver: async (name, type) => {
        if (++calls > 4 || type !== 'TXT' || typeof name !== 'string' || name.length > 253 || !/^[a-zA-Z0-9_.-]+$/.test(name)) throw new Error('DNS budget');
        // Deterministic public-key fixtures for offline library integration tests.
        // Production does not pass records and uses the system resolver.
        const records = workerData.dnsRecords ? workerData.dnsRecords[name] : await dns.resolveTxt(name);
        if (!Array.isArray(records) || JSON.stringify(records).length > 16384) throw new Error('Invalid DNS response');
        return records;
      } });
    parentPort.postMessage({ headerFrom: result.headerFrom, results: result.results.slice(0, 4).map(item => ({ id: item.id,
      signingDomain: item.signingDomain, algo: item.algo, signatureTimeValid: item.signatureTimeValid,
      canonBodyLengthLimited: item.canonBodyLengthLimited, signingHeaders: { keys: item.signingHeaders?.keys },
      status: { result: item.status?.result, testing: item.status?.testing, warnings: item.status?.warnings } })) });
  } finally { dns.cancel(); }
} catch (error) {
  parentPort.postMessage({ error: error.code === 'MODULE_NOT_FOUND' ? 'verifier_unavailable' : 'verification_failed' });
}
