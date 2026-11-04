# Security Advisor review — November 3, 2026

Based on the user's exported 15 WARN findings. The CSV contains metadata rather
than user records. Remote changes must be applied and verified in Supabase;
local migration files alone do not secure production.

## Changes

- 034 enables existing policies on posts/profiles; user screenshots confirm both
  tables now have RLS enabled. This is not a full policy/column privacy audit.
- 035 replaces `swipes`' unrestricted `users can swipe` policy with ownership
  by `swiper_id`, the column verified in scheme.sql. No current app/lib caller
  uses this legacy table; Discover uses profile_skips/profile_likes/match_requests.
- Removes `Anyone reads public Blynk media` listing and allows owners to select
  their UUID folder. Current app/lib code uses public URLs and has no list(),
  download() or createSignedUrl() calls. Upload paths use the owner's UUID.
- Revokes direct anonymous/authenticated EXECUTE on three trigger functions;
  their definitions, triggers and elevated execution context are retained.
- Removes anonymous access to is_blynk_admin, retaining authenticated access
  because moderation policies and triggers use it.

## Intentional authenticated SECURITY DEFINER helpers

Do not revoke or convert these blindly to SECURITY INVOKER. Such a change can
break policies, recursion avoidance, or detection of blocks created by the other
person (the caller cannot select those rows through the blocks owner-only RLS).

| Function | Current purpose and review |
| --- | --- |
| blynk_can_contact(uuid) | Caller-relative boolean for blocks in either direction; no device credentials or block rows returned. Used by sendMessage. |
| blynk_has_accepted_match(uuid) | Accepted match involving auth.uid(); used by message policies. |
| blynk_profile_can_participate(uuid) | Boolean for verified/not-suspended profile; used by RLS and triggers. |
| blynk_profile_is_active(uuid) | Boolean for profile suspension status; used by account-enforcement triggers. |
| is_blynk_admin() | Boolean role membership for auth.uid(); needed for Admin RLS, not an admin-granting function. |

After 035 these five authenticated-function warnings remain as intentional
reviewed access. The user requested addressing them too; 036 is prepared but
not remotely applied or runtime-tested in this session.

## Optional follow-up requested by user: 036 private helpers

- Moves the existing five function objects into `blynk_private`, retaining their
  bodies, ownership and stored-policy dependencies instead of guessing new RLS.
- Redirects qualified helper references in public trigger function definitions.
- Keeps only `public.blynk_can_contact(uuid)` as a SECURITY INVOKER wrapper for
  the existing client RPC. Other helper functions no longer have public RPC names.
- Authenticated callers retain required usage/execute rights in the private
  schema; anonymous roles do not. This is API-surface reduction, not removal of
  the privileged database logic needed by RLS.
- `blynk_private` must not be included in Supabase Data API Exposed schemas.
  A check aborts on an exposed schema reported by the SQL session's PostgREST
  setting; verify Dashboard settings too if that setting is not populated.
- Transaction assertions check expected function/permission architecture.
  No local PostgreSQL runtime or production connection was available for a
  full execution test. Require policy and two-account app tests after applying.
- Do not rerun pre-036 historical migrations: they refer to public helper names
  and could recreate exposed definitions. Future migrations must use private
  names for RLS/trigger references.

## Separate remaining items

- Leaked-password protection: Supabase Auth setting, available on Pro and above.
  The project screenshots show Free. Do not upgrade or claim enabled without
  user authorization and remote verification.
- Removing bucket listing does not make publicly accessible media private.
  Existing chat attachments share blynk-media and public URLs. Private chat
  attachments need a separate private bucket, authorized reads/signed URLs and
  a migration plan for existing files/links. This remains a launch privacy task.
- Table SELECT policies may expose more profile columns than the product UI
  displays. Audit field-level access before claiming profile data is private.

## Validation after applying 035

1. Run its final policy/privilege queries and refresh Security Advisor.
2. Expected: three trigger functions anon=false/authenticated=false;
   is_blynk_admin anon=false/authenticated=true.
3. With two accounts, test profile edit, community post, media upload/display,
   match, message, block, unblock and Admin suspension/restoration.
4. Confirm an ordinary account cannot modify suspended_at or another profile.
5. Keep RLS enabled. Do not suppress residual warnings just to reach zero.

Sources: https://supabase.com/docs/guides/storage/buckets/fundamentals
and https://supabase.com/docs/guides/auth/password-security.
