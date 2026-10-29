// Conservative lexical evidence checks, not a semantic-equivalence score.
// Independent statements may move; protected relationships within them may not.
const required = /\b(?:must|required|mandatory|minimum|at least|requires?|essential|necessary)\b/i;
const preferred = /\b(?:preferred|preferable|desirable|optional|nice to have|good to have|a plus)\b/i;
const negative = /\b(?:no|not|never|without|cannot)\b|\b\w+n['’]t\b/i;
const heading = /^(?:#{1,6}\s*)?(role overview|about (?:us|the role|the company)|responsibilities|duties|required(?: qualifications| skills| requirements| experience)?|minimum qualifications|basic qualifications|qualifications|requirements|skills|preferred(?: qualifications| skills| requirements)?|nice to have|benefits|employment details|application details)\s*(?::|$)/i;
const filler = new Set('a an the is are be been being of for to with in on at by as this that these those have has also please qualifications qualification requirements requirement skills skill required mandatory requires require essential necessary preferred preferable desirable optional nice good plus'.split(' '));
const aliases = new Map(Object.entries({ develop: 'build', develops: 'build', developing: 'build', builds: 'build', building: 'build',
  maintains: 'maintain', maintaining: 'maintain', dependable: 'reliable', duties: 'responsibilities' }));
const numberWords = new Map('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ').map((word, n) => [word, String(n)]));
const units = { '$': 'currency-dollar', '€': 'currency-euro', '£': 'currency-pound', '₹': 'currency-rupee', '¥': 'currency-yen', '%': 'percent' };
const normalize = text => text.toLowerCase().replace(/\*\*|__/g, '')
  .replace(/[$€£₹¥%]/g, symbol => ' ' + units[symbol] + ' ')
  .replace(/(?<![\p{L}\p{N}])[-−](?=\d)/gu, ' negative ')
  .replace(/\bwork with\b/g, 'collaborate with')
  .replace(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g, value => value.replaceAll(',', ''))
  .replace(/\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)\b/g, word => numberWords.get(word))
  .replace(/\b(?:at least|no less than|minimum(?: of)?)\b|>=|≥/g, ' gte ')
  .replace(/\b(?:at most|no more than|maximum(?: of)?|up to)\b|<=|≤/g, ' lte ')
  .replace(/\b(?:more than|greater than)\b|>/g, ' gt ')
  .replace(/\b(?:less than|fewer than)\b|</g, ' lt ')
  .replace(/(\d+(?:\.\d+)?)\+/g, ' gte $1 ');
const terms = text => (normalize(text).match(/\d+(?:\.\d+)*|[\p{L}][\p{L}\p{N}+#'-]*/gu) || [])
  .filter(word => !filler.has(word))
  .map(word => aliases.get(word) || (word.length > 3 && word.endsWith('s') && !/(?:ss|us|is)$/.test(word) ? word.slice(0, -1) : word));

const statements = (text, inheritedRole = 'neutral') => {
  const result = [];
  let role = inheritedRole;
  const marked = text.replace(/([^\n])\s+(?=(?:Required qualifications|Required skills|Requirements|Preferred qualifications|Preferred skills|Responsibilities|Nice to have)\s*:)/gi, '$1\n');
  for (let fragment of marked.split(/\n+|(?<=[.!?])\s+(?=[\p{Lu}])/u)) {
    fragment = fragment.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').replace(/\*\*/g, '').trim();
    const title = fragment.match(heading);
    if (title) {
      role = /preferred|nice to have/i.test(title[1]) ? 'preferred'
        : /required|minimum|basic|qualification|requirement|^skills$/i.test(title[1]) ? 'required' : 'neutral';
      fragment = fragment.slice(title[0].length).trim();
    }
    if (!fragment) continue;
    // Split coordinated bare duties, never a shared negation or modal whose
    // scope across the conjunction would require guessing.
    const clauses = /\b(?:must|can|could|may|might|will|shall)\b/i.test(fragment) || negative.test(fragment) ? [fragment]
      : fragment.split(/\s+and\s+(?=(?:build|develop|maintain|design|collaborate|support|create|manage|lead|implement|deliver|ensure|work|write|analyze|test|review|monitor|document|coordinate|provide|assist|improve)\b)/i);
    for (const clause of clauses) {
      const tokens = terms(clause);
      if (!tokens.length) continue;
      const explicitRole = preferred.test(clause) ? 'preferred' : required.test(clause) ? 'required' : role;
      const modality = /\b(?:can|could|may|might)\b/i.test(clause) ? 'permission'
        : /\b(?:will|shall)\b/i.test(clause) ? 'commitment'
          : /\b(?:must|required|mandatory|necessary|essential)\b/i.test(clause) || explicitRole === 'required' ? 'obligation' : 'neutral';
      result.push({ text: clause, tokens, role: explicitRole, modality,
        negative: negative.test(clause.replace(/\bno (?:less|more) than\b/gi, '')),
        numbers: normalize(clause).match(/\d+(?:\.\d+)*/g) || [] });
    }
  }
  return result;
};
const numericSignature = unit => unit.numbers.length ? unit.tokens.join(' ') : '';
const signature = unit => JSON.stringify([unit.role, unit.modality, unit.negative, unit.tokens]);
const anchorTerms = unit => new Set(unit.tokens.filter(token => !/^\d/.test(token) && !['gte', 'lte', 'gt', 'lt'].includes(token)));

export const checkProseStatements = (source, text, { sectionContext } = {}) => {
  const inheritedRole = /preferred|nice to have/i.test(sectionContext || '') ? 'preferred'
    : /required|minimum|basic|qualification|requirement/i.test(sectionContext || '') ? 'required' : 'neutral';
  const originals = statements(source, inheritedRole), rewritten = statements(text, inheritedRole);
  const available = new Map(), consumed = new Set(), unmatched = [];
  rewritten.forEach((unit, index) => {
    const key = signature(unit);
    if (!available.has(key)) available.set(key, []);
    available.get(key).push(index);
  });
  // Match exact canonical facts first so reordering cannot steal a better match.
  for (const unit of originals) {
    const matches = available.get(signature(unit));
    if (matches?.length) consumed.add(matches.pop());
    else unmatched.push(unit);
  }
  const fail = (reason, original, candidate) => ({ reason, diagnostic: { code: reason,
    evidence: original?.text?.slice(0, 1800), text: candidate?.text?.slice(0, 1200), scope: original?.role } });
  for (const original of unmatched) {
    const anchors = anchorTerms(original);
    let best, bestScore = 0;
    for (let i = 0; i < rewritten.length; i++) {
      if (consumed.has(i)) continue;
      const candidateAnchors = anchorTerms(rewritten[i]);
      const overlap = [...anchors].filter(token => candidateAnchors.has(token)).length;
      const score = overlap / Math.max(anchors.size, candidateAnchors.size, 1);
      if (score > bestScore) { best = i; bestScore = score; }
    }
    if (best === undefined) return fail('source_details_changed', original);
    const candidate = rewritten[best];
    if (original.negative !== candidate.negative) return fail('negation_changed', original, candidate);
    // Report the factual numeric relationship before keyword side effects.
    if (numericSignature(original) !== numericSignature(candidate)) return fail('numeric_relationship_changed', original, candidate);
    if (original.role !== candidate.role) return fail(original.role === 'preferred' ? 'preferred_scope_changed' : 'required_scope_changed', original, candidate);
    if (original.modality !== candidate.modality) return fail(original.role === 'required' ? 'required_scope_changed' : 'source_details_changed', original, candidate);
    return fail('source_details_changed', original, candidate);
  }
  if (consumed.size !== rewritten.length) return fail('unsupported_claim', undefined, rewritten.find((_unit, index) => !consumed.has(index)));
  return { reason: null };
};
