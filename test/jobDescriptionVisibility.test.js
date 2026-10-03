import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { fileURLToPath } from 'node:url';
import { normalizeJobListResponseJob } from '../src/controllers/jobController.js';
import { PUBLIC_JOB_TYPE_EXPRESSION } from '../src/utils/publicJobType.js';

const fixtures = [
  { title: 'Engineer', jobType: 'Full-time', sourceDescription: 'Develop enterprise applications.', description: 'Recent graduates welcome.' },
  { title: 'Engineer', jobType: 'Full-time', sourceDescription: 'Recent graduates welcome.', description: 'Develop enterprise applications.' },
];
test('public response hides source provenance and keeps display wording out of categories', () => {
  const result = normalizeJobListResponseJob(fixtures[0]);
  assert.equal(result.jobType, 'Full-time Experienced');
  assert.equal(result.sourceDescription, undefined);
  assert.equal(result.description, fixtures[0].description);
  assert.equal(normalizeJobListResponseJob(fixtures[1]).jobType, 'Full-time Fresher');
});
test('Mongo pagination/category decisions use preserved source and match public responses', { timeout: 120000 }, async t => {
  const mongo = await MongoMemoryServer.create({ binary: { version: '8.2.6', downloadDir: fileURLToPath(new URL('../.cache/mongodb-binaries/', import.meta.url)) } });
  t.after(async () => { await mongoose.disconnect(); await mongo.stop(); });
  await mongoose.connect(mongo.getUri());
  const collection = mongoose.connection.collection('source_description_visibility');
  await collection.insertMany(structuredClone(fixtures));
  const actual = await collection.aggregate([{ $project: { category: PUBLIC_JOB_TYPE_EXPRESSION } }]).toArray();
  assert.deepEqual(actual.map(row => row.category), ['Full-time Experienced', 'Full-time Fresher']);
});
