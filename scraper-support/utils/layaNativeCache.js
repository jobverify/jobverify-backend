import fs from 'node:fs';
import path from 'node:path';
import { renameFileWithRetry } from './runCheckpoint.js';
import { CLASSIFICATION_POLICY, NATIVE_RUNTIME_HASH, hashClassificationInput } from '../../src/services/jobClassificationPolicy.js';

const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const validNativePrediction = (prediction, identity) => {
  if (prediction?.complete !== true || !Number.isInteger(prediction.windows) || prediction.windows < 1 || prediction.windows > 10000
    || prediction.reason || !prediction.identity || !digest(prediction.identity.runtimeHash)) return false;
  if (['modelRevision', 'runtimeVersion', 'runtimeHash', 'policyHash', 'calibrationHash'].some(key => prediction.identity[key] !== identity[key])) return false;
  const questions = Object.keys(CLASSIFICATION_POLICY.questions);
  if (!prediction.answers || Object.keys(prediction.answers).length !== questions.length) return false;
  if (prediction.conflicts !== undefined && (!Array.isArray(prediction.conflicts) || prediction.conflicts.some(key => !questions.includes(key)))) return false;
  return questions.every(key => {
    const answer = prediction.answers[key], labels = Object.keys(CLASSIFICATION_POLICY.questions[key].criteria), probabilities = answer?.probabilities;
    if (!probabilities || typeof probabilities !== 'object' || Object.keys(probabilities).length !== labels.length || !labels.includes(answer.choice)) return false;
    if (labels.some(label => !Object.hasOwn(probabilities, label) || typeof probabilities[label] !== 'number'
      || !Number.isFinite(probabilities[label]) || probabilities[label] < 0 || probabilities[label] > 1)) return false;
    return Math.abs(labels.reduce((sum, label) => sum + probabilities[label], 0) - 1) <= .002
      && probabilities[answer.choice] >= Math.max(...Object.values(probabilities)) - .00001;
  });
};

export const nativeScanProvenance = (record, reused) => ({ inputHash: record.inputHash,
  identity: { ...record.prediction.identity }, nativeRuntimeHash: record.nativeRuntimeHash, completedAt: record.completedAt, reused });

export const createNativeScanCache = ({ cacheDirectory, onError = () => {} } = {}) => {
  const root = cacheDirectory ? path.join(cacheDirectory, '.native', NATIVE_RUNTIME_HASH) : null;
  const read = (input, runtimeHash) => {
    const identity = Object.fromEntries(['modelRevision', 'runtimeVersion', 'runtimeHash', 'policyHash', 'calibrationHash'].map(key => [key, input[key]]));
    identity.runtimeHash = runtimeHash;
    const inputHash = hashClassificationInput(input, identity);
    try {
      const record = JSON.parse(fs.readFileSync(path.join(root, runtimeHash, `${inputHash}.json`), 'utf8'));
      return record.formatVersion === 1 && record.nativeRuntimeHash === NATIVE_RUNTIME_HASH && record.inputHash === inputHash
        && typeof record.completedAt === 'string' && Number.isFinite(Date.parse(record.completedAt))
        && validNativePrediction(record.prediction, identity) ? record : null;
    } catch (error) {
      if (!['ENOENT', 'SyntaxError'].includes(error.code || error.name)) onError(error);
      return null;
    }
  };
  const load = input => {
    if (!root || input.incomplete) return null;
    try {
      const runtimes = fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory() && digest(entry.name)).map(entry => entry.name);
      // Prefer the current resolver's record when it is present.
      runtimes.sort((a, b) => Number(b === input.runtimeHash) - Number(a === input.runtimeHash));
      for (const runtimeHash of runtimes) {
        const record = read(input, runtimeHash);
        if (record) return record;
      }
    } catch (error) { if (error.code !== 'ENOENT') onError(error); }
    return null;
  };
  const save = (input, prediction, completedAt) => {
    if (input.incomplete || !validNativePrediction(prediction, input)) return null;
    const record = { formatVersion: 1, nativeRuntimeHash: NATIVE_RUNTIME_HASH, inputHash: input.inputHash, completedAt, prediction };
    if (!root) return record;
    const directory = path.join(root, input.runtimeHash), file = path.join(directory, `${input.inputHash}.json`), temporary = `${file}.${process.pid}.tmp`;
    try { fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(temporary, JSON.stringify(record)); renameFileWithRetry(temporary, file); }
    catch (error) { onError(error); }
    finally { try { fs.rmSync(temporary, { force: true }); } catch (error) { onError(error); } }
    return record;
  };
  return { load, save };
};
