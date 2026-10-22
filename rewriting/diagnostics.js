const clip = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : undefined;

/** Bounded employer-text samples belong only in the diagnostic artifact, never console summaries. */
export const createRewriteDiagnostics = ({ maxSamples = 10, maxBytes = 65536 } = {}) => {
  if (!Number.isInteger(maxSamples) || maxSamples < 0 || maxSamples > 10 || !Number.isInteger(maxBytes) || maxBytes < 4096 || maxBytes > 65536) throw new Error('Invalid rejection diagnostic limits');
  const state = { totalRejected: 0, reasons: Object.create(null), samples: [], maxSamples, maxBytes };
  return { record({ id, input, response, reason, diagnostic } = {}) {
    state.totalRejected++;
    let key = typeof reason === 'string' && /^[a-z_]{1,64}$/.test(reason) ? reason : 'unknown';
    if (!Object.hasOwn(state.reasons, key) && Object.keys(state.reasons).length >= 32) key = 'other';
    state.reasons[key] = (state.reasons[key] || 0) + 1;
    if (state.samples.length >= maxSamples) return;
    const raw = response?.rawValue ?? response?.value;
    const sample = { id: clip(id, 64), inputHash: clip(input?.inputHash, 64), reason: key,
      sourceContext: clip(diagnostic?.evidence || input?.sourceDescription, 1800),
      completionPreview: raw === undefined ? undefined : clip(JSON.stringify(raw), 2400),
      validation: diagnostic ? { section: clip(diagnostic.section, 64), itemIndex: Number.isInteger(diagnostic.itemIndex) ? diagnostic.itemIndex : undefined,
        text: clip(diagnostic.text, 1200), evidence: clip(diagnostic.evidence, 1800), scope: clip(diagnostic.scope, 32) } : undefined,
      generationRequests: response?.generationRequests, retrySkipped: response?.retrySkipped };
    state.samples.push(sample);
    // Reserve space for all bounded reason counters as the run continues.
    while (state.samples.length && Buffer.byteLength(JSON.stringify(state)) > maxBytes - 4096) state.samples.pop();
  }, snapshot: () => structuredClone(state) };
};
