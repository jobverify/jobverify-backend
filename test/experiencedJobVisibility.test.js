import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Job from '../src/models/Job.js';
import User from '../src/models/User.js';
import SiteSettings from '../src/models/SiteSettings.js';
import { getSiteSettings } from '../src/services/siteSettingsService.js';
import { updateSiteSettings } from '../src/controllers/siteSettingsController.js';
import { getSavedJobs } from '../src/controllers/userController.js';
import { loadSiteSettings } from '../src/middleware/siteSettings.js';
import { refreshJobDatasetSummary } from '../src/services/jobDatasetSummaryService.js';

process.env.JWT_SECRET = 'visibility-tests-only-secret-at-least-32-characters';

test('experienced job visibility is reversible and consistent across public surfaces', { timeout: 120000 }, async (t) => {
  const mongo = await MongoMemoryServer.create({ binary: {
    downloadDir: fileURLToPath(new URL('../.cache/mongodb-binaries/', import.meta.url)),
    version: '8.2.6',
  } });
  t.after(async () => { await mongoose.disconnect(); await mongo.stop(); });
  await mongoose.connect(mongo.getUri());
  const { default: jobRoutes } = await import('../src/routes/jobRoutes.js');
  const categories = ['Full-time Experienced', 'Full-time Fresher', 'Internship', 'Contract', 'Others', 'Full-time'];
  const ids = categories.map(() => new mongoose.Types.ObjectId());
  await Job.collection.insertMany(categories.map((jobType, index) => ({
    _id: ids[index], title: `Opportunity ${index}`, company: `Company ${index}`, companyKey: `company ${index}`,
    jobType, status: 'active', isPublicIndia: true, city: 'Bangalore', country: 'India',
    sourceUrl: `https://example.com/jobs/${index}`, applyUrl: `https://example.com/jobs/${index}`,
    postedAt: new Date('2026-01-01'), sortDate: new Date('2026-01-01'),
  })));
  const userId = new mongoose.Types.ObjectId();
  await User.collection.insertOne({ _id: userId, email: 'visibility@example.com', savedJobs: ids });
  await refreshJobDatasetSummary(); // Seed an all-category summary to catch stale totals.
  const app = express();
  app.use(express.json());
  app.use('/api/jobs', jobRoutes);
  app.put('/settings', (req, _res, next) => { req.user = { _id: userId }; next(); }, updateSiteSettings);
  app.get('/saved', loadSiteSettings, (req, _res, next) => { req.user = { _id: userId }; next(); }, getSavedJobs);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const read = async (path) => {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    return response.json();
  };

  await t.test('old settings preserve existing visibility and partial updates preserve billing', async () => {
    assert.equal((await getSiteSettings()).experiencedJobsEnabled, true);
    await SiteSettings.create({ _id: 'global', billingEnabled: true });
    const response = await fetch(base + '/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ experiencedJobsEnabled: false }) });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, { billingEnabled: true, experiencedJobsEnabled: false });
  });
  // Keep downstream tests independent of the settings-update assertion.
  await SiteSettings.collection.updateOne({ _id: 'global' }, { $set: { billingEnabled: false, experiencedJobsEnabled: false } }, { upsert: true });

  await t.test('list pagination and stats exclude the category and its legacy alias', async () => {
    const result = await read('/api/jobs?limit=2');
    assert.equal(result.data.length, 2);
    assert.equal(result.pagination.total, 4);
    assert.equal(result.pagination.totalCompanies, 4);
    assert.deepEqual((await read('/api/jobs/stats')).data, { totalJobs: 4, totalCompanies: 4 });
    assert.equal((await read('/api/jobs?jobType=Full-time%20Experienced')).pagination.total, 0);
  });
  await t.test('search, metadata, company suggestions and live companies use the same scope', async () => {
    assert.equal((await read('/api/jobs/search')).data.length, 4);
    const meta = (await read('/api/jobs/meta')).data;
    assert.ok(!meta.jobTypes.includes('Full-time Experienced'));
    assert.equal((await read('/api/jobs/meta/companies')).data.companies.length, 4);
    assert.equal((await read('/api/jobs/live-companies')).data.companies.length, 4);
    assert.ok(!(await read('/api/jobs/meta?city=Bangalore')).data.jobTypes.includes('Full-time Experienced'));
  });
  await t.test('direct links and SEO feed exclude experienced jobs', async () => {
    assert.equal((await fetch(base + `/api/jobs/${ids[0]}`)).status, 404);
    assert.equal((await fetch(base + `/api/jobs/${ids[1]}`)).status, 200);
    assert.equal((await read('/api/jobs/seo-feed')).data.length, 4);
  });
  await t.test('analytics distributions and totals are calculated from visible jobs', async () => {
    const summary = (await read('/api/jobs/snapshot')).data;
    assert.equal(summary.totalJobs, 4);
    assert.equal(summary.totalCompanies, 4);
    assert.equal(summary.locations[0].count, 4);
    assert.equal(summary.jobTypes.reduce((sum, row) => sum + row.count, 0), 4);
    assert.ok(!summary.jobTypes.some(row => row.label === 'Full-time Experienced'));
  });
  await t.test('saved jobs are hidden without deleting bookmarks', async () => {
    const result = await read('/saved');
    assert.equal(result.data.length, 4);
    assert.equal(result.profileOverview.savedJobs, 4);
    assert.equal((await User.findById(userId)).savedJobs.length, 6);
  });
  await t.test('visibility follows public categories when legacy stored labels disagree', async () => {
    const variants = [
      { jobType: 'Full-time Fresher', experienceRequired: '5 years', title: 'Software Engineer' },
      { jobType: 'Full-time', experienceLevel: 'Entry Level', title: 'Graduate Engineer' },
      { jobType: 'Full-time Experienced', employmentType: 'Contract', title: 'Engineer' },
    ];
    const variantIds = variants.map(() => new mongoose.Types.ObjectId());
    await Job.collection.insertMany(variants.map((variant, index) => ({
      ...variant, _id: variantIds[index], company: 'Legacy ' + index, companyKey: 'legacy ' + index,
      status: 'active', isPublicIndia: true, city: 'Bangalore', sourceUrl: 'https://example.com/legacy/' + index,
      postedAt: new Date('2026-01-01'), sortDate: new Date('2026-01-01'),
    })));
    try {
      const result = await read('/api/jobs');
      assert.equal(result.pagination.total, 6);
      assert.ok(!result.data.some(job => job.jobType === 'Full-time Experienced'));
      assert.equal(result.data.find(job => job._id === String(variantIds[1]))?.jobType, 'Full-time Fresher');
      assert.equal(result.data.find(job => job._id === String(variantIds[2]))?.jobType, 'Contract');
      assert.equal((await fetch(base + '/api/jobs/' + variantIds[0])).status, 404);
      assert.equal((await read('/api/jobs/stats')).data.totalJobs, 6);
      assert.equal((await read('/api/jobs/snapshot')).data.totalJobs, 6);
      assert.ok(!(await read('/api/jobs/meta')).data.jobTypes.includes('Full-time Experienced'));
    } finally { await Job.deleteMany({ _id: { $in: variantIds } }); }
  });
  await t.test('reenabling restores jobs, counts, links and bookmarks', async () => {
    await SiteSettings.collection.updateOne({ _id: 'global' }, { $set: { experiencedJobsEnabled: true } });
    assert.equal((await read('/api/jobs')).pagination.total, 6);
    assert.equal((await read('/api/jobs/stats')).data.totalJobs, 6);
    assert.equal((await read('/saved')).data.length, 6);
    assert.equal((await fetch(base + `/api/jobs/${ids[0]}`)).status, 200);
    assert.equal(await Job.countDocuments({}), 6);
  });
});
