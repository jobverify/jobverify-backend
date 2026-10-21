import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import Job from '../src/models/Job.js';
import Resume from '../src/models/Resume.js';
import ResumeArtifact from '../src/models/ResumeArtifact.js';
import TailoredResume from '../src/models/TailoredResume.js';
import { uploadResume, removeResume } from '../src/controllers/resumeController.js';

const response = () => ({ status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const latex = '\\documentclass{article}\n\\begin{document}Asha Rao, asha@example.test. React project, 2025. BSc 2026.\\end{document}';
const result = { latex, pdf: Buffer.from('%PDF-1.7\ncompiled-test-document\n%%EOF'), pageCount: 1, facts: { name: 'Asha Rao' }, modelVersion: 'local-test', styleVersion: 'test' };
const sha = data => createHash('sha256').update(data).digest('hex');

test('prepared and tailored artifacts publish only for the current owner/source/revision', { timeout: 90000 }, async t => {
  process.env.MONGOMS_RUNTIME_DOWNLOAD = 'false';
  const mongo = await MongoMemoryServer.create({ binary: { version: '8.2.6', downloadDir: fileURLToPath(new URL('../.cache/mongodb-binaries/', import.meta.url)) } });
  t.after(async () => { await mongoose.disconnect(); await mongo.stop(); });
  await mongoose.connect(mongo.getUri(), { dbName: 'resume_pipeline_test' });
  const id = new mongoose.Types.ObjectId();
  const other = new mongoose.Types.ObjectId();
  const job = new mongoose.Types.ObjectId();
  const owner = { _id: id };
  await User.collection.insertOne({ _id: id, email: 'asha@example.test', savedJobs: [job] });
  await Job.collection.insertOne({ _id: job, title: 'React Engineer', company: 'Example', location: 'Pune, India', isPublicIndia: true, status: 'active', description: 'Build React applications.', fingerprint: 'pipeline-job' });
  const uploaded = response();
  await uploadResume({ user: owner, headers: { 'x-resume-filename': 'resume.tex' }, body: Buffer.from(latex) }, uploaded);
  assert.equal(uploaded.statusCode, 200);
  assert.ok(uploaded.body.data.preparation, 'a changed upload automatically queues preparation');
  const preparation = await import('../src/services/resumePreparationService.js');
  const tailoring = await import('../src/services/resumeTailoringService.js');
  const dispatch = async () => {};
  await preparation.requestResumePreparation(owner, { dispatch });
  await assert.rejects(tailoring.requestTailoredResume(owner, String(job), { dispatch }), /prepar/i);
  const identical = response();
  const first = await Resume.findById(id).lean();
  await uploadResume({ user: owner, headers: { 'x-resume-filename': 'resume.tex' }, body: Buffer.from(latex) }, identical);
  assert.equal(identical.body.data.preparation.revision, first.preparation.revision, 'identical originals reuse their pending conversion');
  assert.equal(new Date(identical.body.data.uploadedAt).getTime(), first.uploadedAt.getTime());
  let calls = 0;
  await Promise.all([preparation.drainResumePreparations({ generate: async input => { calls++; assert.equal(input.mode, 'base'); assert.match(input.source.text, /Asha Rao/); return result; } }), preparation.drainResumePreparations({ generate: async () => { calls++; return result; } })]);
  assert.equal(calls, 1, 'one lease publishes one base generation');
  const ready = await Resume.findById(id).lean();
  assert.equal(ready.preparation.status, 'completed');
  assert.equal((await ResumeArtifact.findOne({ user: id }).lean()).pdf, undefined);
  assert.equal(await ResumeArtifact.countDocuments({ user: id }), 1);
  const { readResumeArtifact } = await import('../src/services/resumeArtifactService.js');
  assert.equal(await readResumeArtifact(other, ready.preparation.generationId), null);
  assert.deepEqual((await readResumeArtifact(id, ready.preparation.generationId)).pdf.buffer, result.pdf);
  await ResumeArtifact.updateOne({ _id: ready.preparation.generationId, user: id }, { $set: { pdf: Buffer.from('%PDF-mutated'), user: other } });
  assert.deepEqual((await readResumeArtifact(id, ready.preparation.generationId)).pdf.buffer, result.pdf, 'stored generations are immutable');
  await preparation.requestResumePreparation(owner, { regenerate: true, dispatch });
  await preparation.drainResumePreparations({ generate: async () => { throw Error('private model payload'); } });
  const failed = await Resume.findById(id).lean();
  assert.equal(failed.preparation.status, 'failed');
  assert.equal(failed.preparation.generationId, ready.preparation.generationId, 'retry failure keeps a successful PDF');
  assert.doesNotMatch(failed.preparation.error, /private model/);
  const retried = await preparation.requestResumePreparation(owner, { dispatch });
  assert.equal(retried.preparation.status, 'queued', 'retrying a failed conversion preserves its PDF and queues new work without an extra flag');
  await preparation.drainResumePreparations({ generate: async () => result });
  const latest = await Resume.findById(id).lean();
  assert.notEqual(latest.preparation.generationId, ready.preparation.generationId);
  assert.equal(await ResumeArtifact.countDocuments({ user: id }), 1, 'only the latest base remains');
  await Promise.all(Array.from({ length: 4 }, () => tailoring.requestTailoredResume(owner, String(job), { dispatch })));
  assert.equal(await TailoredResume.countDocuments({ user: id }), 1);
  const counts = await tailoring.drainTailoredResumes({ generate: async input => { assert.equal(input.mode, 'tailored'); assert.equal(input.baseLatex, latex); assert.equal(input.jobSnapshot.title, 'React Engineer'); return result; }, maxTasks: 99 });
  assert.deepEqual(counts, { attempted: 1, completed: 1, failed: 0 });
  const tailored = await tailoring.getTailoredResume(owner, String(job));
  assert.equal(tailored.output, undefined);
  assert.equal(tailored.outputFormat, 'latex-pdf'); assert.equal(tailored.hasPdf, true); assert.equal(tailored.hasLatex, true);
  await tailoring.requestTailoredResume(owner, String(job), { regenerate: true, dispatch });
  await tailoring.drainTailoredResumes({ generate: async () => { throw Error('private prompt'); } });
  assert.equal((await tailoring.getTailoredResume(owner, String(job))).hasPdf, true);
  await tailoring.requestTailoredResume(owner, String(job), { regenerate: true, dispatch });
  await tailoring.drainTailoredResumes({ generate: async () => { await Resume.updateOne({ _id: id }, { $set: { sha256: 'b'.repeat(64) } }); return result; } });
  assert.equal((await tailoring.getTailoredResume(owner, String(job))).stale, true);
  assert.equal(await ResumeArtifact.countDocuments({ user: id }), 2, 'stale result never creates an additional artifact');
  await Resume.updateOne({ _id: id }, { $set: { sha256: sha(latex) } });
  await t.test('job changes and replaced base generations cannot publish a late tailored result', async () => {
    const originalGeneration = (await TailoredResume.findOne({ user: id }).lean()).generationId;
    const baseGeneration = (await Resume.findById(id).lean()).preparation.generationId;
    for (const change of ['job', 'base']) {
      await tailoring.requestTailoredResume(owner, String(job), { regenerate: true, dispatch });
      const count = await ResumeArtifact.countDocuments({ user: id });
      const failed = await tailoring.drainTailoredResumes({ generate: async () => {
        if (change === 'job') await Job.updateOne({ _id: job }, { $set: { location: 'Bengaluru, India' } });
        else await Resume.updateOne({ _id: id }, { $set: { 'preparation.generationId': 'newer-base-generation' } });
        return result;
      } });
      assert.deepEqual(failed, { attempted: 1, completed: 0, failed: 1 });
      assert.equal((await TailoredResume.findOne({ user: id }).lean()).generationId, originalGeneration);
      assert.equal(await ResumeArtifact.countDocuments({ user: id }), count);
      await Job.updateOne({ _id: job }, { $set: { location: 'Pune, India' } });
      await Resume.updateOne({ _id: id }, { $set: { 'preparation.generationId': baseGeneration } });
    }
  });
  await t.test('old-generation cleanup failure cannot revoke a published base PDF', async st => {
    const before = (await Resume.findById(id).lean()).preparation.generationId;
    await preparation.requestResumePreparation(owner, { regenerate: true, dispatch });
    const deleteOne = ResumeArtifact.deleteOne.bind(ResumeArtifact);
    st.mock.method(ResumeArtifact, 'deleteOne', filter => filter._id === before ? Promise.reject(Error('cleanup unavailable')) : deleteOne(filter));
    const completed = await preparation.drainResumePreparations({ generate: async (_input, options) => {
      await options.onPhase('compiling');
      assert.equal((await Resume.findById(id).lean()).preparation.phase, 'compiling');
      return result;
    } });
    assert.deepEqual(completed, { attempted: 1, completed: 1, failed: 0 });
    const current = await Resume.findById(id).lean();
    assert.equal(current.preparation.status, 'completed');
    assert.notEqual(current.preparation.generationId, before);
    assert.ok(await readResumeArtifact(id, current.preparation.generationId));
  });
  await t.test('a post-publication account check failure restores the last successful base', async st => {
    const before = (await Resume.findById(id).lean()).preparation.generationId;
    await preparation.requestResumePreparation(owner, { regenerate: true, dispatch });
    const exists = User.exists.bind(User);
    let checks = 0;
    st.mock.method(User, 'exists', async filter => {
      if (++checks === 4) throw Error('private database error');
      return exists(filter);
    });
    assert.deepEqual(await preparation.drainResumePreparations({ generate: async () => result }), { attempted: 1, completed: 0, failed: 1 });
    const current = await Resume.findById(id).lean();
    assert.equal(current.preparation.status, 'failed');
    assert.equal(current.preparation.generationId, before);
    assert.ok(await readResumeArtifact(id, before));
    assert.doesNotMatch(current.preparation.error, /private database/);
  });
  await t.test('a source replacement after artifact insertion prevents publication and cleans up the unpublished bytes', async st => {
    await preparation.requestResumePreparation(owner, { regenerate: true, dispatch });
    const create = ResumeArtifact.create.bind(ResumeArtifact);
    const count = await ResumeArtifact.countDocuments({ user: id });
    st.mock.method(ResumeArtifact, 'create', async data => {
      const artifact = await create(data);
      await Resume.updateOne({ _id: id }, { $set: { sha256: 'c'.repeat(64) } });
      return artifact;
    });
    assert.deepEqual(await preparation.drainResumePreparations({ generate: async () => result }), { attempted: 1, completed: 0, failed: 1 });
    assert.equal(await ResumeArtifact.countDocuments({ user: id }), count);
    assert.equal((await Resume.findById(id).lean()).preparation.hasPdf, undefined);
    await Resume.updateOne({ _id: id }, { $set: { sha256: sha(latex), 'preparation.status': 'failed' } });
  });
  await t.test('an older worker cannot delete a successful PDF retained by a newer retry revision', async st => {
    await preparation.requestResumePreparation(owner, { regenerate: true, dispatch });
    const updateOne = Resume.updateOne.bind(Resume);
    const exists = User.exists.bind(User);
    let failNextCheck = false;
    st.mock.method(Resume, 'updateOne', async (filter, update, options) => {
      const updated = await updateOne(filter, update, options);
      if (update.$set?.['preparation.status'] === 'completed') {
        await preparation.requestResumePreparation(owner, { regenerate: true, dispatch });
        failNextCheck = true;
      }
      return updated;
    });
    st.mock.method(User, 'exists', async filter => {
      if (failNextCheck) { failNextCheck = false; throw Error('temporary account check failure'); }
      return exists(filter);
    });
    await preparation.drainResumePreparations({ generate: async () => result });
    const retry = await Resume.findById(id).lean();
    assert.equal(retry.preparation.status, 'queued');
    assert.ok(await readResumeArtifact(id, retry.preparation.generationId), 'a newer request keeps its latest successful PDF');
    await Resume.updateOne({ _id: id }, { $set: { 'preparation.status': 'failed', 'preparation.ready': false } });
  });
  await preparation.requestResumePreparation(owner, { regenerate: true, dispatch });
  await preparation.drainResumePreparations({ generate: async () => { await removeResume({ user: owner }, response()); return result; } });
  assert.equal(await Resume.countDocuments({ user: id }), 0);
  assert.equal(await ResumeArtifact.countDocuments({ user: id }), 0, 'a deletion during conversion cannot repopulate artifacts');
  assert.equal(await TailoredResume.countDocuments({ user: id }), 0);
});
