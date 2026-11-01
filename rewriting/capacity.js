/** Whole-description latency of fresh inference, separate from copying/reuse. */
export function summarizeRewriteCapacity(results, { startedAt, finishedAt, attempted = results.length } = {}) {
  const seconds = Math.max(0, (Date.parse(finishedAt) - Date.parse(startedAt)) / 1000) || 0;
  const fresh = results.filter(result => result.generationRequests > 0 && !result.modelPlanCached);
  const durations = fresh.map(result => result.durationMs).filter(ms => Number.isFinite(ms) && ms > 0).sort((a, b) => a - b);
  const published = results.filter(result => result.ok && result.published !== false);
  const sum = key => published.reduce((total, result) => total + (result.quality?.[key] || 0), 0);
  const capacity = { elapsedSeconds: seconds,
    modelRequests: results.reduce((total, result) => total + (result.generationRequests || 0), 0),
    attemptsPerHour: seconds ? attempted / seconds * 3600 : 0,
    publishedPerHour: seconds ? published.length / seconds * 3600 : 0,
    p50DurationMs: durations[Math.floor(durations.length * .5)] ?? null,
    p95DurationMs: durations[Math.min(durations.length - 1, Math.floor(durations.length * .95))] ?? null,
    freshInferenceDescriptions: fresh.length,
    renderedWithoutInference: published.filter(result => result.renderedWithoutInference).length,
    cachedDescriptions: published.filter(result => result.modelPlanCached).length,
    modelEditedDescriptions: published.filter(result => (result.quality?.modelEditedBlocks ?? result.quality?.modelEditedItems ?? 0) > 0).length,
    sourcePreservedDescriptions: published.filter(result => (result.quality?.modelEditedBlocks ?? result.quality?.modelEditedItems) === 0).length,
    modelEditedBlocks: sum('modelEditedBlocks'), sourcePreservedBlocks: sum('sourcePreservedBlocks'),
    protectedSourceBlocks: sum('protectedSourceBlocks'), sourceFallbackBlocks: sum('sourceFallbackBlocks'),
  };
  if (published.some(result => Number.isInteger(result.quality?.modelEditedItems))) {
    capacity.modelEditedItems = sum('modelEditedItems'); capacity.sourceCopiedItems = sum('sourceCopiedItems');
  }
  return capacity;
}
