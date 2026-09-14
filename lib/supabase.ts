import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase now calls this the publishable key. The ANON_KEY fallback keeps
// existing projects working while they migrate their environment variables.
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the project has been connected to a Supabase project. */
export const isSupabaseConfigured = Boolean(url && publicKey);

// Keeping this nullable lets the visual MVP run before secrets are configured.
// Protected features check it and show an actionable message instead of crashing.
export const supabase = isSupabaseConfigured
  ? createClient(url as string, publicKey as string)
  : null;
