import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

export function hasPushServerConfig() {
  return Boolean(supabaseUrl && supabasePublicKey && serviceRoleKey && vapidPublicKey && vapidPrivateKey && vapidSubject);
}

export function getVapidPublicKey() {
  return vapidPublicKey || "";
}

export function getServiceSupabase() {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Push server is not configured.");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function getPushUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token || !supabaseUrl || !supabasePublicKey) return null;
  const client = createClient(supabaseUrl, supabasePublicKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user;
}

export function configureWebPush() {
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) throw new Error("VAPID is not configured.");
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}
