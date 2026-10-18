import { NextResponse } from "next/server";
import { getPushUser, getServiceSupabase, hasPushServerConfig } from "@/lib/push-server";

export const runtime = "nodejs";

type SubscriptionBody = { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } };

export async function POST(request: Request) {
  if (!hasPushServerConfig()) return NextResponse.json({ error: "Push notifications are not configured." }, { status: 503 });
  const user = await getPushUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as SubscriptionBody | null;
  const subscription = body?.subscription;
  if (!subscription?.endpoint?.startsWith("https://") || !subscription.keys?.p256dh || !subscription.keys.auth) {
    return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  }

  const { error, status } = await getServiceSupabase().from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: request.headers.get("user-agent") || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) {
    // Return only a safe category, never subscription credentials or database details.
    const reason = ["42P01", "PGRST205", "PGRST204", "42703", "42P10"].includes(error.code) ? "push_database_setup"
      : error.code === "42501" ? "push_database_access"
      : status === 401 || error.code === "PGRST301" || error.code === "PGRST303" ? "push_server_key"
      : error.code === "23503" ? "push_project_mismatch" : "device_save";
    return NextResponse.json({ error: reason }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getPushUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { endpoint?: string } | null;
  if (!body?.endpoint) return NextResponse.json({ error: "Missing device." }, { status: 400 });
  const { error } = await getServiceSupabase().from("push_subscriptions").delete()
    .eq("user_id", user.id).eq("endpoint", body.endpoint);
  if (error) return NextResponse.json({ error: "Could not remove this device." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
