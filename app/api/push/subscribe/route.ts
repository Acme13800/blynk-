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

  const { error } = await getServiceSupabase().from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: request.headers.get("user-agent") || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: "Could not save this device." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
