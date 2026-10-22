import { generateResumeText } from '../outreach/resumeRuntime.js';
import { resumeFailure } from '../outreach/resumeDiagnostics.js';
import { buildComparisonPrompt } from '../src/services/resumeLatexContent.js';

// Public synthetic controls only. No account, resume upload or database access.
const source = { text: 'Synthetic Candidate\nsynthetic@example.test | +91 90000 00000\nEXPERIENCE\nExample Systems\nSoftware Engineer | Jan 2022 - Present\nBuilt Java API tests.\nEDUCATION\nExample University\nBSc Computer Science | 2018 - 2022\nSKILLS\nJava, SQL', links: ['mailto:synthetic@example.test'] };
const formatted = source.text.replace('Example Systems\nSoftware Engineer | Jan 2022 - Present', 'Software Engineer\nExample Systems\nJanuary 2022 – Present')
  .replace('Example University\nBSc Computer Science | 2018 - 2022', 'BSc Computer Science\nExample University\n2018 – 2022');

export async function verifyResumeComparison({ deadline = Date.now() + 5 * 60000, generate = generateResumeText, onDiagnostic = () => {} } = {}) {
  for (const invented of [false, true]) {
    const prompt = buildComparisonPrompt({ source, latexText: formatted + (invented ? '\nLed a global engineering team.' : ''),
      links: [...source.links, 'tel:+919000000000'], tailored: false });
    const result = JSON.parse(await generate(prompt, { deadline, comparison: true, onDiagnostic }));
    if (typeof result?.evidence !== 'string' || !result.evidence.trim() || !Array.isArray(result.missingFacts) || !Array.isArray(result.unsupportedClaims)
      || (invented ? result.supported !== false || !result.unsupportedClaims.length
        : result.supported !== true || result.missingFacts.length || result.unsupportedClaims.length)) {
      throw resumeFailure('factual_validation_failed');
    }
  }
  return { comparisonControls: 2, supportedFormattingAccepted: true, unsupportedLeadershipRejected: true };
}
