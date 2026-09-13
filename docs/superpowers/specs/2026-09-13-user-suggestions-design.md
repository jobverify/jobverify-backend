# User Suggestions Design

## Goal

Replace the generic feedback copy on the public contact page with an authenticated “Your dream company is missing?” suggestion flow. A signed-in user can submit at most five suggestions per India calendar day, each suggestion is stored in MongoDB, and administrators can review every submission as its own row in a new “User suggestions” admin section.

## Scope

This change includes:

- the contact-page call to action and suggestion dialog;
- sign-in redirect and return-to-dialog behavior;
- server-side message validation and durable daily quota enforcement;
- MongoDB persistence for one suggestion per document;
- a paginated, read-only admin suggestions table;
- account-deletion cleanup for suggestion records; and
- frontend and backend automated coverage.

It does not include suggestion statuses, editing, deletion from the admin panel, replies, notifications, or automatic company creation.

## User Experience

The current “Questions or feedback about Jobverify?” section is replaced by a card with:

- heading: “Your dream company is missing?”;
- short supporting copy inviting the user to send the Jobverify team a note;
- primary button: “Send us a note”; and
- a concise note that signed-in users may send up to five suggestions per day.

For authenticated users, the button opens a centered, accessible dialog. The dialog contains a single textarea, a live `N / 100 words` counter, validation feedback, Cancel and Submit actions, and a short explanation of the daily limit. Escape, the close control, and Cancel close the dialog. Focus is trapped while open and returns to the trigger after closing.

For unauthenticated users, the button redirects to:

`/login?next=%2Fcontact%3FcomposeSuggestion%3D1`

After successful sign-in, the existing safe `next` handling returns the user to the contact page. The contact page opens the dialog and removes the `composeSuggestion` query parameter with a replace navigation so refreshes do not repeatedly reopen it.

On success, the dialog shows a confirmation, clears the textarea, reports the number of submissions remaining that day, and offers a Done action. Network and validation failures preserve the draft so the user can retry. A daily-limit response explains that the allowance resets at midnight India time.

## Message Rules

- The request body is `{ "message": string }`.
- Leading and trailing whitespace is removed before storage.
- A word is a non-empty token separated by one or more Unicode-aware whitespace characters.
- Empty messages are rejected.
- Messages containing more than 100 words are rejected in both the UI and the API.
- The API is authoritative; client-side checks exist only for immediate feedback.
- The existing global 32 KB JSON request limit remains the payload-size safety boundary.

## Daily Quota Semantics

“Per day” means a calendar day from 00:00:00 through 23:59:59.999 in `Asia/Kolkata`. India has a fixed UTC+05:30 offset, so the backend derives a `submittedDay` key in `YYYY-MM-DD` form after applying that offset.

Each suggestion document receives a `dailySlot` from 1 through 5. A unique compound index on `(user, submittedDay, dailySlot)` is the concurrency boundary. On submission, the service attempts slots in order and continues only when MongoDB reports a duplicate-key collision. The first successful insert consumes that slot; if all five collide, the API returns HTTP 429. This prevents simultaneous requests from exceeding the quota without requiring multi-document transactions or in-memory counters.

## Data Model

Add a `UserSuggestion` model with:

- `user`: required immutable `ObjectId` reference to `User`;
- `message`: required trimmed string with the 100-word validator;
- `submittedDay`: required immutable India-date string matching `YYYY-MM-DD`;
- `dailySlot`: required immutable integer from 1 through 5; and
- normal Mongoose `createdAt` and `updatedAt` timestamps.

Indexes:

- unique `{ user: 1, submittedDay: 1, dailySlot: 1 }` for quota enforcement;
- `{ createdAt: -1, _id: -1 }` for stable newest-first admin pagination; and
- `{ user: 1, createdAt: -1 }` for account cleanup and future user-scoped inspection.

The JSON transform removes `__v` and exposes `id` consistently with existing models.

Suggestions remain linked to the user rather than duplicating name or email snapshots. Both the normal account-deletion controller and the local sweep-delete script delete that user’s suggestions before deleting the user record. This preserves the project’s existing promise to remove account-linked records and prevents orphaned personal content.

## API Design

### Submit a suggestion

`POST /api/user/suggestions`

Middleware order:

1. existing authenticated-user protection;
2. suggestion body validation;
3. existing validation-result handling; and
4. submission controller.

Success response: HTTP 201 with `success`, a confirmation `message`, and `data` containing `id`, `message`, `createdAt`, and `remainingToday`.

Failures:

- HTTP 400 for empty, non-string, or over-100-word content;
- HTTP 401 for no or invalid session;
- HTTP 403 for an existing deactivated-user restriction;
- HTTP 429 after all five daily slots are occupied; and
- the project’s standard sanitized HTTP 500 response for unexpected database errors.

### List suggestions for administrators

`GET /api/admin/suggestions?page=1&limit=20`

The existing admin router already applies authentication and the admin-role guard. Query validation accepts page 1–2000 and limit 1–50, matching other admin tables. The controller returns stable newest-first pagination:

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "message": "Please add Example Company.",
      "createdAt": "2026-09-13T12:00:00.000Z",
      "user": {
        "id": "...",
        "email": "member@example.com",
        "profile": { "name": "Member Name" }
      }
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

## Frontend Architecture

Add a small suggestion feature module containing:

- a pure word-count helper shared by UI validation and counter display; and
- an API function that uses the existing `apiFetch`, CSRF, cookie-session, and normalized API-error behavior.

The contact page owns only transient dialog state: open/closed, draft, pending, error, and success. It reads authentication from the existing auth slice and uses the existing safe login-return convention. A shadcn-compatible Radix dialog primitive is added to the local UI component set and styled through existing tokens plus focused contact-page classes.

The admin API and Redux slice gain a paginated suggestion collection, loading state, and error state. A lazy-loaded `AdminUserSuggestions` component follows the existing admin table conventions. `AdminPage` gains the tab definition and content panel with label “User suggestions.” The table columns are Submitted, User, Email, and Suggestion. Long messages wrap rather than being clipped, and the empty, loading, error, retry, and pagination states match the other admin sections.

## Error Handling and Security

- Authentication and role authorization remain server-side requirements.
- CSRF protection and JSON-only mutation handling are inherited from the existing app middleware.
- Validation error bodies do not echo sensitive values beyond the existing safe validation behavior.
- Duplicate-key errors are treated as occupied daily slots only for the quota index; unrelated database errors are not misreported as quota exhaustion.
- The UI disables duplicate submits while a request is pending, but concurrency correctness does not depend on the UI.
- Suggestion text is rendered as React text content in the admin table, never as HTML.
- No user-supplied data is written to admin audit details or application logs.

## Testing

Backend tests cover:

- word counting and validation at 0, 1, 100, and 101 words;
- India-date derivation across the UTC boundary;
- successful slot allocation and the returned remaining count;
- duplicate-slot retries and rejection of the sixth submission;
- unexpected database error handling;
- route authentication and input validation;
- admin-only access, query validation, sort/pagination response shape, and populated user projection;
- schema indexes and constraints; and
- removal of suggestions from both account-deletion paths.

Frontend tests cover:

- the pure word-count helper;
- replacement contact-page copy;
- guest sign-in redirect with the encoded return URL;
- automatic dialog opening after login return;
- live word count and blocking at 101 words;
- success, retained-draft error, and daily-limit states;
- admin tab registration; and
- one suggestion per row with loading, empty, error, retry, and pagination behavior.

The final verification runs focused backend and frontend tests first, then each project’s complete test/lint/build checks. A rendered browser pass checks desktop and mobile contact-dialog behavior, keyboard accessibility, dark/light themes, and the admin table.
