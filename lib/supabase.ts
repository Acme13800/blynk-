import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the project has been connected to a Supabase project. */
export const isSupabaseConfigured = Boolean(url && anonKey);

// Keeping this nullable lets the visual MVP run before secrets are configured.
// Protected features check it and show an actionable message instead of crashing.
export const supabase = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;
