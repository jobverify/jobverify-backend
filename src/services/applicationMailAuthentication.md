# Application mailbox authentication boundary

Automatic confirmation requires a fresh successful strict DKIM verification of
the original Gmail RAW bytes and an explicit employer/tenant rule. Stored trust
metadata and Gmail FULL fields never authorize an ingest or retry. The existing
readonly OAuth grant, callback routes, and owner Link/Dismiss API are unchanged.

## Deployment prerequisites

1. Obtain `mailauth@8.0.4` through an approved registry and generate a real pinned
   manifest/lockfile update in an installation that does not write through the
   shared `node_modules` junction. No dependency/lockfile entry was fabricated
   while network access was unavailable. The worker requires precisely 8.0.4;
   missing or different versions fail closed to review.
2. Run `node --test test/applicationMailboxAuthentication.test.js` with that real
   dependency. The real-library subtest must execute, not skip, and validate the
   generated RSA signature, tampering, plain/base64/quoted-printable/encoded
   subject/multipart samples, and automatic database mutation. Policy doubles
   are explicitly labeled and are not evidence that crypto integration works.
3. Provision `APPLICATION_MAIL_TRUST_RULES` as a server-owned JSON array, at most
   100 entries / 32768 characters. No production senders or tenants are seeded.
   Missing, malformed, or unmatched configuration leaves mail pending. Every
   rule requires these five fields:

   | Field | Required meaning |
   | --- | --- |
   | `company` | The explicit tracked employer identity; NFKC/case/punctuation normalization only |
   | `sender` | Exact lowercase From addr-spec, established by the employer/ATS operator |
   | `signingDomain` | Exact lowercase DKIM `d=` domain authorized for that sender and employer |
   | `origin` | Exact HTTPS application origin, without trailing slash, credentials or custom port |
   | `tenantPath` | Explicit case-sensitive tenant path ending `/`, e.g. `/approved-tenant/jobs/` |

   Establish each mapping with the responsible employer/ATS operator. A shared
   ATS signing domain alone is insufficient; never infer or learn mappings from
   an incoming message, company slug, hostname, or user-submitted data.
4. Drain old mailbox ingests and owner-link requests when replacing the prior
   nontransactional implementation. New Link, mailbox fencing and evidence
   writes commit atomically. Mixing old writers with the new implementation
   cannot provide the new atomicity guarantees.

## Supported automatic interpretation

The signature must use SHA-256, pass strict verification, be time-valid, sign
the unique From/To/Subject/Date/Message-ID/MIME-Version/Content-Type plus any
present transfer-encoding/disposition headers, and cover the complete body
without `l=`. RSA keys must be at least 2048 bits. To must be exactly this mailbox.
Injected Authentication-Results, display sender names and stored proofs provide
no authority. Unknown or ambiguous sender/recipient syntax remains pending.

Single text/plain and one multipart/alternative plain+HTML pair are supported.
UTF-8/US-ASCII, base64, quoted-printable and encoded subjects are supported. Both
alternative views must agree on whitespace-normalized text and exact job links.
HTML accepts a bounded non-executing structural subset; CSS, comments, hidden or
active content, malformed tags, unsupported entities, attachments, nested/mixed
MIME and conflicting renderings remain pending. Unsupported charset/MIME candidates
from Gmail's acknowledgement search retain bounded RAW header metadata for review,
even when a neutral subject and unreadable body cannot be classified. Missing,
invalid or future sender Date may use a valid Gmail internalDate for pending review
only. Neither fallback invokes the automatic verifier or supplies automatic proof;
strict RAW size/header bounds and unusable provider-date rejection still apply.

One exact HTTPS URL must match one tracked application and the configured origin
and tenant path. The same short paragraph must contain the acknowledgement,
employer, role and job link. Quoted/footer matches and contradictory tracked-job
clues stay pending. URL fragments, percent escapes, credentials, nondefault ports,
redirects and query/path differences are not normalized into matches. Conservative
interpretation can require manual review for otherwise legitimate mail.

Limits: 512 KiB decoded RAW; 32 KiB root/part headers; 100 headers; 8192 characters
per unfolded header; four DKIM signatures; 20 MIME parts; depth four; 2000 HTML
tokens; four TXT lookups, each with 700 ms timeout and one try; 16 KiB DNS answer;
three-second worker lifetime, 48 MiB old heap / 8 MiB young heap; two concurrent
verifiers per process. JSON is bounded while streaming before parse. Oversized
messages are skipped so one message cannot permanently block the sync cursor.

No original MIME, DNS answer or private signing material is stored or logged.
Only optional internal status/reason and digest/time metadata are persisted.
Fresh proof is checked again at the transactional mutation boundary. Owner
deletion and disconnect/reconnect fence writes. Unverified pending rows have no
application binding; legacy guesses become suggestions when revisited and can
be explicitly rebound/dismissed. Already linked/dismissed history is preserved.
The same authenticated receipt redelivered under another Gmail ID reuses its
earlier evidence key; legacy `gmail:<row-id>` evidence keys remain unchanged.
