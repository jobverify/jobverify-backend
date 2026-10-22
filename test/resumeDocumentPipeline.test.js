import test from 'node:test';
import assert from 'node:assert/strict';
import { processResumeDocument } from '../outreach/resumePipeline.js';

const source = { text: 'Alex Example\nalex@example.com\nEXPERIENCE\nExample Corp\nSoftware Engineer | Jan 2022 - Present\nDeveloped Java services and automated tests.\nEDUCATION\nExample University\nBSc Computer Science | 2018 - 2022', links: ['mailto:alex@example.com'] };
const latex = '\\documentclass[11pt]{article}\n\\begin{document}\nAlex Example\\end{document}';
const compiled = { pdf: Buffer.from('%PDF-test'), text: source.text, links: source.links, pageCount: 2 };
const supported = JSON.stringify({ evidence: 'All generated claims match the original source facts.', supported: true, missingFacts: [], unsupportedClaims: [] });

test('pipeline separately compares source claims and returns only validated documents', async () => {
  const calls = [];
  const result = await processResumeDocument({ mode: 'base', source }, {
    generate: async (prompt, options) => { calls.push(options.comparison); return options.comparison ? supported : latex; },
    compile: async () => compiled,
  });
  assert.deepEqual(calls, [undefined, true]);
  assert.equal(result.pageCount, 2);
  assert.equal(result.latex, latex);
  assert.ok(result.facts);
});

test('one repair can fix pagination, with no unbounded model loop', async () => {
  let generations = 0, compilations = 0;
  const result = await processResumeDocument({ mode: 'tailored', source, baseLatex: latex, jobSnapshot: { title: 'Engineer' } }, {
    generate: async (_prompt, options) => options.comparison ? supported : (generations++, latex),
    compile: async () => ({ ...compiled, pageCount: ++compilations === 1 ? 3 : 2 }),
  });
  assert.equal(generations, 2);
  assert.equal(result.pageCount, 2);
});

test('a failed comparison never publishes a document and permits only one repair', async () => {
  let generations = 0;
  await assert.rejects(processResumeDocument({ mode: 'base', source }, {
    generate: async (_prompt, options) => options.comparison
      ? JSON.stringify({ evidence: 'Original employment dates are absent from the generated document.', supported: false, missingFacts: ['employment dates'], unsupportedClaims: [] }) : (generations++, latex),
    compile: async () => compiled,
  }), /validation.*retry/i);
  assert.equal(generations, 2);
});

test('base preserves long resumes while tailoring enforces two pages', async () => {
  const result = await processResumeDocument({ mode: 'base', source }, {
    generate: async (_prompt, options) => options.comparison ? supported : latex,
    compile: async () => ({ ...compiled, pageCount: 4 }),
  });
  assert.equal(result.pageCount, 4);
});

test('an incomplete generation uses the same single bounded repair and emits content-free diagnostics', async () => {
  let generations = 0;
  const events = [];
  const result = await processResumeDocument({ mode: 'base', source }, {
    onDiagnostic: event => events.push(event),
    generate: async (_prompt, options) => {
      if (options.comparison) return supported;
      if (++generations === 1) throw Object.assign(new Error('private incomplete resume'), { code: 'model_output_incomplete' });
      return latex;
    },
    compile: async () => compiled,
  });
  assert.equal(generations, 2);
  assert.equal(result.pageCount, 2);
  assert.ok(events.some(event => event.code === 'model_output_incomplete' && event.stage === 'generating'));
  assert.doesNotMatch(JSON.stringify(events), /alex@|Example Corp|private|documentclass/);
});

test('failed repair retains a useful safe failure code without leaking compiler text', async () => {
  const events = [];
  await assert.rejects(processResumeDocument({ mode: 'base', source }, {
    onDiagnostic: event => events.push(event),
    generate: async () => latex,
    compile: async () => { throw Object.assign(new Error('private document line with alex@example.com'), { code: 'compiler_dependency_missing' }); },
  }), error => {
    assert.equal(error.code, 'compiler_dependency_missing');
    assert.match(error.message, /compiler.*dependenc/i);
    assert.doesNotMatch(error.message, /alex@|private document/);
    return true;
  });
  assert.equal(events.filter(event => event.code === 'compiler_dependency_missing').length, 2);
});

test('oversized full input is rejected once without spending a repair generation', async () => {
  let calls = 0;
  await assert.rejects(processResumeDocument({ mode: 'base', source }, {
    generate: async () => { calls++; throw Object.assign(new Error('Input too large; nothing truncated.'), { statusCode: 422, code: 'input_too_large' }); },
    compile: async () => assert.fail('oversized input must not compile'),
  }), { statusCode: 422 });
  assert.equal(calls, 1);
});

test('a comparison without source evidence cannot publish a resume', async () => {
  await assert.rejects(processResumeDocument({ mode: 'base', source }, {
    generate: async (_prompt, options) => options.comparison ? JSON.stringify({ supported: true, missingFacts: [], unsupportedClaims: [] }) : latex,
    compile: async () => compiled,
  }), error => error.code === 'comparison_invalid');
});
