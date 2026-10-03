import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareTrainingRows } from '../scripts/prepareLayaTrainingDataset.js';

test('annotation export never treats inferred categories as employer facts or human labels', () => {
  const [row] = prepareTrainingRows([{ companyKey: 'example', job: { title: 'Associate', description: '2025 graduates can apply.', jobType: 'Intern', employmentType: 'Internship', experienceRequired: '0' } }]);
  assert.equal(row.labelSource, null);
  assert.equal(row.expected.employment, null);
  assert.equal(row.job.sourceEmploymentType, '');
  assert.equal(row.job.sourceExperienceRequired, '');
  assert.equal(row.targetCase, true);
});

test('duplicate jobs are removed before splitting and one employer stays in one split', () => {
  const rows = prepareTrainingRows([
    { companyKey: 'example', job: { title: 'Engineer', description: 'Build software.' } },
    { companyKey: 'example', job: { title: ' Engineer ', description: '  BUILD software. ' } },
    { companyKey: 'example', job: { title: 'Manager', description: 'Manage engineering.' } },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].split, rows[1].split);
});
