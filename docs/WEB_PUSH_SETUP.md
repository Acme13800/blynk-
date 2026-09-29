# Web Push setup for Blynk

The app creates VAPID keys in the local `.env.local` file. They are ignored by Git and must never be committed or pasted into chat.

Add these **Production**, **Preview**, and **Development** environment variables in Vercel, using the matching values from `.env.local`:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` — replace the placeholder with `mailto:your-real-support-email@example.com`
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase Dashboard → Project Settings → API → service_role secret

Keep `SUPABASE_SERVICE_ROLE_KEY` and `VAPID_PRIVATE_KEY` private. They are server-only and must not start with `NEXT_PUBLIC_`.

Run `supabase/migrations/030_web_push_subscriptions.sql` once in Supabase SQL Editor, then deploy the app. In Blynk, open **Profile** and click **Enable notifications**. Accept the browser prompt to register that device.

To test, use two confirmed accounts on different browsers or devices. Enable notifications on the receiving account, close its Blynk tab, then send it a message or a match request from the other account.
