# Jobverify Backend

## Public job abuse protection

The public browse, search and job-detail routes use an in-memory guard keyed by
client IP. It tracks distinct pagination values and distinct job IDs. Repeating
the same value within a window does not increase that distinct-value count.
Metadata, statistics, SEO feeds and click tracking are outside this guard.

Configure these environment variables before starting the backend:

| Variable | Default | Purpose |
| --- | ---: | --- |
| `PUBLIC_JOB_ABUSE_PAGE_WALK_WINDOW_MS` | `60000` | Pagination tracking window in milliseconds. |
| `PUBLIC_JOB_ABUSE_PAGE_WALK_LIMIT` | `30` | Distinct pagination values allowed per client in that window. |
| `PUBLIC_JOB_ABUSE_DETAIL_WINDOW_MS` | `60000` | Job-detail tracking window in milliseconds. |
| `PUBLIC_JOB_ABUSE_DETAIL_LIMIT` | `90` | Distinct job IDs allowed per client in that window. |
| `PUBLIC_JOB_ABUSE_VIOLATION_WINDOW_MS` | `900000` | Window for counting requests that exceed a limit. |
| `PUBLIC_JOB_ABUSE_VIOLATION_LIMIT` | `5` | Violations that trigger a temporary block. |
| `PUBLIC_JOB_ABUSE_BLOCK_MS` | `900000` | Temporary block duration in milliseconds. |
| `PUBLIC_JOB_ABUSE_MAX_RECORDS` | `5000` | Maximum client records retained; the oldest are evicted. |

Exceeding a distinct-value limit returns HTTP `429`. Repeated violations reach
the block threshold and return HTTP `403`. Both responses include `Retry-After`
in seconds and `Cache-Control: no-store`. Invalid or nonpositive configuration
values fall back to the defaults. The legacy `PUBLIC_JOB_ABUSE_WINDOW_MS` value
is a fallback for either tracking window when its explicit variable is absent.

Set `TRUST_PROXY` to match the actual trusted proxy path so Express resolves the
client IP correctly. It defaults to disabled; `true` or `1` trusts one hop,
an integer specifies a hop count, and an address or CIDR specifies trusted
networks. Avoid trusting client-supplied forwarding headers indiscriminately.

Each backend process holds its own counters. A restart or Render Free spin-down
clears that process's state. Upstream controls, such as Cloudflare WAF rules,
must be configured separately when protection needs to persist independently
of the backend process.
