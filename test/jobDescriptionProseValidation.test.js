import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProsePart } from '../rewriting/prose.js';

for (const [name, source, output] of [
  ['number spelling', 'At least 2 years of Python experience is required.', 'At least two years of Python experience is required.'],
  ['independent statement order', 'Salary is 100000. At least 2 years of Python experience is required.', 'At least 2 years of Python experience is required. Salary is 100000.'],
  ['Markdown and equivalent wording', 'Responsibilities:\nBuild reliable Python applications and maintain automated tests.', '## Responsibilities\n- Develop reliable Python applications and maintain automated tests.'],
  ['numeric formatting', 'Salary is 100,000 USD.', 'Salary is 100000 USD.'],
]) test(`equivalent ${name} passes statement-bound validation`, () => assert.equal(validateProsePart(source, output), null));

for (const [name, source, output, reason] of [
  ['reversed threshold', 'At least 2 years of Python experience is required.', 'At most 2 years of Python experience is required.', 'numeric_relationship_changed'],
  ['swapped numeric subjects', 'Python requires 2 years. Java requires 5 years.', 'Java requires 2 years. Python requires 5 years.', 'numeric_relationship_changed'],
  ['swapped subjects in one statement', 'Python requires 2 years and Java requires 5 years.', 'Java requires 2 years and Python requires 5 years.', 'numeric_relationship_changed'],
  ['changed numeric unit', 'Complete training in 2 days.', 'Complete training in 2 weeks.', 'numeric_relationship_changed'],
  ['missing duty', 'Build Python services. Maintain automated tests.', 'Build Python services.', 'source_details_changed'],
  ['new claim', 'Build Python services.', 'Build Python services. Receive free health insurance.', 'unsupported_claim'],
  ['relocated negation', 'No travel. Overtime is required.', 'Travel is required. No overtime.', 'negation_changed'],
  ['qualification promotion', 'Requirements:\nPython is required. AWS is preferred.', 'Requirements:\nPython is preferred. AWS is required.', 'required_scope_changed'],
  ['lost condition', 'Travel only when customers request it.', 'Travel when customers request it.', 'source_details_changed'],
  ['missing conditional duty', 'Build Python services and maintain tests when needed.', 'Build Python services.', 'source_details_changed'],
]) test(`${name} cannot pass validation`, () => assert.equal(validateProsePart(source, output), reason));

test('heading wording can change without changing the attached qualification scope', () => {
  assert.equal(validateProsePart('Required qualifications:\nPython experience.', '## Requirements\nPython experience.'), null);
  assert.equal(validateProsePart('Preferred qualifications:\nAWS experience.', '## Required qualifications\nAWS experience.'), 'preferred_scope_changed');
});

test('numeric technical identifiers and comparison operators remain intact', () => {
  const source = 'Use C++ vector<T> with HTTP/2 and Python 3.11. Latency must be < 100 ms.';
  assert.equal(validateProsePart(source, source), null);
  assert.equal(validateProsePart(source, source.replace('< 100', '> 100')), 'numeric_relationship_changed');
});

test('actors and actions cannot exchange positions within a statement', () => {
  assert.equal(validateProsePart('You support customers.', 'Customers support you.'), 'source_details_changed');
  assert.equal(validateProsePart('Our team mentors your team.', 'Your team mentors our team.'), 'source_details_changed');
});

for (const [source, output] of [
  ['Salary is $100000.', 'Salary is €100000.'],
  ['Salary is $100000.', 'Salary is 100000.'],
  ['Bonus is 10%.', 'Bonus is 10.'],
  ['Temperature is -20 C.', 'Temperature is 20 C.'],
]) test(`numeric punctuation is factual: ${source}`, () => assert.equal(validateProsePart(source, output), 'numeric_relationship_changed'));

test('obligation and commitment cannot become permission within the same section', () => {
  assert.equal(validateProsePart('Requirements:\nYou must work remotely.', 'Requirements:\nYou can work remotely.'), 'required_scope_changed');
  assert.equal(validateProsePart('We will provide visa sponsorship.', 'We can provide visa sponsorship.'), 'source_details_changed');
  assert.equal(validateProsePart('We will provide sponsorship and can assist relocation.', 'We can provide sponsorship and will assist relocation.'), 'source_details_changed');
});

test('equivalent lower-bound notation and ordinary collaboration phrasing are accepted', () => {
  assert.equal(validateProsePart('2+ years of Python experience is required.', 'At least two years of Python experience is required.'), null);
  assert.equal(validateProsePart('Collaborate with cross-functional teams to deliver reliable software.', 'Work with cross-functional teams to deliver reliable software.'), null);
});

test('coordinated duties can become separate bullets without losing either duty', () => {
  assert.equal(validateProsePart('Build Python services and maintain automated tests.', '- Build Python services.\n- Maintain automated tests.'), null);
});
