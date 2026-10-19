import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Job from '../src/models/Job.js';
import { readHiringSnapshot } from '../src/services/hiringObservationService.js';

test('direction aggregates follow visible MongoDB jobs, deduplicate skills, and clear after purge', { timeout: 120000 }, async t => {
  const mongo = await MongoMemoryServer.create({ binary: {
    version: '8.2.6', downloadDir: fileURLToPath(new URL('../.cache/mongodb-binaries/', import.meta.url)),
  } });
  t.after(async () => { await mongoose.disconnect(); await mongo.stop(); });
  await mongoose.connect(mongo.getUri());
  const now = new Date('2026-10-19T08:00:00Z');
  const skill = canonicalName => ({ canonicalName });
  const fixtures = [
    { primaryRoleDomain: 'Engineering', workArrangement: 'Remote', jobSkills: [skill('Python'), skill('Python'), skill(' python '), skill('SQL'), skill('')] },
    { jobType: 'Intern', primaryRoleDomain: 'Engineering', workArrangement: 'Hybrid', jobSkills: [skill('Python')] },
    { jobType: 'Intern', jobSkills: [skill('  ')] },
    { status: 'expired', primaryRoleDomain: 'Excluded', jobSkills: [skill('Excluded')] },
    { status: 'hidden', primaryRoleDomain: 'Excluded', jobSkills: [skill('Excluded')] },
    { closingDate: new Date('2026-10-18'), primaryRoleDomain: 'Excluded' },
    { isPublicIndia: false, city: 'London', country: 'United Kingdom', primaryRoleDomain: 'Excluded' },
  ];
  await Job.collection.insertMany(fixtures.map((job, index) => ({
    fingerprint: `direction-${index}`, title: 'Engineer', company: 'Acme',
    jobType: 'Full-time Experienced', status: 'active', isPublicIndia: true,
    city: 'Bangalore', country: 'India', description: 'Build software with the engineering team.', ...job,
  })));
  const all = await readHiringSnapshot({ experiencedJobsEnabled: true }, now);
  assert.equal(all.totalJobs, 3);
  assert.deepEqual(all.roles, [{ label: 'Engineering', count: 2 }, { label: 'Not specified', count: 1 }]);
  assert.deepEqual(all.arrangements, ['Not specified', 'Hybrid', 'Remote'].map(label => ({ label, count: 1 })));
  assert.deepEqual(all.skills, [{ label: 'Python', count: 2 }, { label: 'SQL', count: 1 }]);
  assert.equal(all.skillCoverage, 2);
  const early = await readHiringSnapshot({ experiencedJobsEnabled: false }, now);
  assert.equal(early.totalJobs, 2);
  assert.equal(early.skillCoverage, 1);
  assert.deepEqual(early.skills, [{ label: 'Python', count: 1 }]);
  await Job.deleteMany({});
  const empty = await readHiringSnapshot({}, now);
  assert.equal(empty.totalJobs, 0);
  assert.equal(empty.skillCoverage, 0);
  for (const field of ['roles', 'arrangements', 'skills']) assert.deepEqual(empty[field], []);
});
