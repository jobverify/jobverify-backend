# Google Auth Design

**Date:** 2026-08-09
**Status:** Proposed
**Applies to:** `jobverify-frontend`, `jobverify-backend`

## Summary

Add `Sign up with Google` and `Sign in with Google` to Jobverify without replacing the existing email/password system. Google auth must reuse the current Jobverify session model, must automatically link to an existing Jobverify account when the verified Gmail address matches, and must avoid creating duplicate accounts when a matching pending registration already exists.

## Current State

Jobverify currently uses:

- frontend login and register pages backed by Redux auth thunks
- backend auth endpoints that issue the normal Jobverify session cookie
- email verification through `PendingUser` before a new password account becomes active
- password reset through the existing reset-token flow

The current flow assumes every `User` has a password and every new registration starts as a `PendingUser`.

## Goals

- Add a Google auth entry point on both login and registration pages.
- Keep the existing Jobverify session cookie and authenticated user payload unchanged.
- Automatically link Google auth to an existing `User` when the verified Google email matches.
- Promote a matching `PendingUser` into a verified `User` instead of creating a duplicate record.
- Allow a Google-created user to add password login later through the existing password reset flow.
- Keep normal email/password auth working when Google auth is not configured.

## Non-Goals

- No replacement of the current email/password login flow.
- No Google API access beyond identity verification.
- No account-link management UI in profile settings for this change.
- No social-login support for providers other than Google.

## Options Considered

### Option 1: Google Identity Services credential flow with backend token exchange

Use Google Identity Services in the browser to obtain an ID token, then send that token to the backend for verification and normal Jobverify session creation.

**Pros**

- Fits the existing frontend Redux auth flow.
- Preserves the current backend-owned session cookie model.
- Keeps login and register pages on the same architecture.
- Requires only one new backend auth handler.

**Cons**

- Requires Google Identity Services script loading in the frontend.
- Requires backend token verification against Google.

### Option 2: Full OAuth authorization-code flow with backend callback routes

Send users through a redirect-based OAuth flow, handle callbacks on the backend, and then create the Jobverify session.

**Pros**

- Good foundation if future Google API scopes are needed.

**Cons**

- More routes, redirects, state handling, and callback complexity than the current need justifies.
- Heavier implementation than the current identity-only requirement.

### Option 3: Backend redirect-only Google start flow without GIS button rendering

Trigger a backend-managed Google redirect from the frontend and complete auth through callback handling.

**Pros**

- Keeps the frontend thinner.

**Cons**

- Still carries most redirect-flow complexity.
- Worse UX than rendering the supported Google button directly in the auth screens.

## Decision

Adopt **Option 1**.

Jobverify will use Google Identity Services in the frontend and a backend token-exchange endpoint that verifies the Google credential and then issues the existing Jobverify auth cookie.

## Architecture

### Frontend

The frontend will:

- add a reusable Google auth UI unit that loads the Google Identity Services script once
- render a Google button on both the login and register pages
- dispatch a shared Redux thunk when Google returns a credential
- preserve the existing authenticated navigation behavior after success

The Google auth UI unit will:

- read `VITE_GOOGLE_CLIENT_ID`
- render nothing when the client ID is missing
- expose success and error callbacks to the page component
- support Google button text appropriate to the page context:
  - login page: `continue_with`
  - register page: `signup_with`

The Redux auth layer will:

- add a thunk named `authenticateWithGoogle`
- send the Google ID token to the backend through `apiFetch`
- persist the returned Jobverify user snapshot through the same success path used by password login
- surface API errors through the existing auth error state

### Backend

The backend will:

- add a new public `POST /api/auth/google` endpoint
- protect that endpoint with an auth-scoped rate limiter
- validate the posted Google credential
- verify the Google ID token with the backend Google client ID
- issue the existing Jobverify auth cookie on success

The backend will verify:

- the ID token signature using Google verification utilities
- the token audience matches the configured Google client ID
- the Google email exists
- `email_verified` is `true`

The backend implementation will use Google's official Node verification library rather than homegrown JWT verification logic.

## Data Model Changes

### User

`User` will gain optional Google linkage metadata:

- `google.sub`: the stable Google subject identifier
- `google.picture`: the latest Google profile image URL when available
- `google.linkedAt`: the first time the Jobverify account was linked to Google

`User.password` will become nullable with a default of `null`.

This represents users who were created through Google and have not added a password yet. Password reset remains the supported path for such users to add password login later.

### PendingUser

`PendingUser` does not require a schema change.

Its existing fields already contain the data needed for promotion:

- email
- optional password hash
- profile name
- optional WhatsApp phone number

## Backend Decision Tree

### 1. Matching active `User` exists

If a `User` exists for the normalized verified Google email:

- reject with `403` if the account is deactivated
- reject with `409` if the account is already linked to a different `google.sub`
- otherwise link Google metadata if not already linked
- update lightweight Google metadata such as `picture` when available
- apply the existing expired-access downgrade behavior
- set `lastLoginAt`
- issue the normal Jobverify auth cookie
- return the normal Jobverify user payload

This is the path that implements the approved rule: **a matching verified Gmail address signs into the existing Jobverify account instead of creating a new one**.

### 2. No `User`, but matching `PendingUser` exists

If no `User` exists and a `PendingUser` exists for the normalized verified Google email:

- create a verified `User`
- preserve the pending profile name
- preserve the pending WhatsApp phone number in `contact.phoneE164`
- preserve the pending password hash if one exists
- otherwise store `password: null`
- store Google linkage metadata
- delete the `PendingUser`
- clear the pending-registration cookie
- set `lastLoginAt`
- issue the normal Jobverify auth cookie
- return the normal Jobverify user payload

This avoids duplicate accounts when someone starts with email/password registration and later finishes with Google.

### 3. No `User` and no `PendingUser`

If neither record exists:

- create a verified `User`
- use the Google email
- use the Google display name when provided
- store `password: null`
- store Google linkage metadata
- mark `isVerified: true`
- set `lastLoginAt`
- issue the normal Jobverify auth cookie
- return the normal Jobverify user payload

## Password Auth Behavior After Google Signup

The password login route must handle users whose `password` is `null`.

When a password login attempt targets a Google-only account with no password set:

- return `401`
- provide a clear message telling the user to continue with Google or use password reset to add email sign-in

The forgot-password route remains valid for Google-only accounts:

- it should still issue a reset token
- after reset, the user can log in with either password or Google

## Configuration

### Frontend

Add:

- `VITE_GOOGLE_CLIENT_ID`

Behavior:

- when present, show Google auth buttons
- when absent, hide Google auth buttons and keep the page fully usable for email/password auth

### Backend

Add:

- `GOOGLE_CLIENT_ID`

Behavior:

- when present, allow backend Google credential verification
- when absent, `POST /api/auth/google` returns a controlled server-side error and never creates a session

## Error Handling

Google auth must fail closed.

The backend returns no session for:

- missing credential
- malformed credential
- expired credential
- bad Google signature
- token audience mismatch
- missing email
- `email_verified !== true`
- deactivated user
- existing account linked to a different Google subject

Frontend copy should keep the response simple and actionable:

- invalid or expired credential: ask the user to try again
- unverified Google email: ask the user to use a verified Google account
- passwordless existing account via password login: direct the user to Google sign-in or password reset

## Route And Validation Changes

### Backend routes

Add:

- `POST /api/auth/google`

Keep existing routes unchanged:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- verification and password reset routes

### Backend validation

Add a dedicated validator for the Google auth request body that requires:

- `credential` as a non-empty string with a bounded maximum length

The Google route will not require Turnstile because Google has already provided the identity assertion for this flow.

## Frontend Screen Changes

### Login page

Add a Google entry point above the password form:

- branded divider and Google button
- page-level error surface reused for Google auth failures

The existing password form, Turnstile widget, and forgot-password link stay in place.

### Register page

Add a Google entry point above the manual registration form:

- branded divider and Google button
- copy that makes it clear Google can start account creation faster

The existing manual registration form stays in place.

### Shared behavior

Both pages will use the same Google success path:

- dispatch `authenticateWithGoogle`
- persist the returned user
- navigate exactly as the current auth success path does

## Testing Strategy

### Frontend tests

Add or update tests to cover:

- Google auth UI renders only when `VITE_GOOGLE_CLIENT_ID` is configured
- login page contains the Google auth entry point
- register page contains the Google auth entry point
- `authenticateWithGoogle` stores the authenticated user through the same success path as password login
- frontend hides Google UI cleanly when config is absent

### Backend tests

Add or update tests to cover:

- route surface includes `POST /api/auth/google`
- existing user with matching email signs into the same account and stores Google linkage metadata
- matching `PendingUser` is promoted into a verified `User`
- brand-new Google signup creates a verified `User`
- deactivated user is rejected
- unverified Google email is rejected
- invalid credential is rejected
- password login returns the passwordless-account message when `password` is `null`

## Rollout Notes

Implementation requires:

- frontend Google client configuration
- backend Google client configuration
- installation of the official Google verification library in the backend

If configuration is missing in local or preview environments, Jobverify continues to operate with email/password auth only.
