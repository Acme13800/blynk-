import { NextResponse } from "next/server";
import webpush from "web-push";
import { configureWebPush, getPushUser, getServiceSupabase, hasPushServerConfig } from "@/lib/push-server";

export const runtime = "nodejs";

type PushBody = { kind?: "message" | "match"; recipientId?: string; referenceId?: string; language?: "en" | "es" };

export async function POST(request: Request) {
  if (!hasPushServerConfig()) return NextResponse.json({ error: "Push notifications are not configured." }, { status: 503 });
  const sender = await getPushUser(request);
  if (!sender) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as PushBody | null;
  if (!body?.recipientId || !body.referenceId || (body.kind !== "message" && body.kind !== "match")) {
    return NextResponse.json({ error: "Invalid notification request." }, { status: 400 });
  }

  const admin = getServiceSupabase();
  const referenceTable = body.kind === "message" ? "messages" : "match_requests";
  const { data: reference } = await admin.from(referenceTable).select("sender_id, receiver_id, recipient_id").eq("id", body.referenceId).maybeSingle();
  const isAuthorized = body.kind === "message"
    ? reference?.sender_id === sender.id && reference?.receiver_id === body.recipientId
    : reference?.sender_id === sender.id && reference?.recipient_id === body.recipientId;
  if (!isAuthorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: senderProfile } = await admin.from("profiles").select("display_name").eq("id", sender.id).maybeSingle();
  const senderName = senderProfile?.display_name || "Blynk";
  const spanish = body.language === "es";
  const payload = JSON.stringify({
    title: body.kind === "message" ? `Blynk · ${senderName}` : "Blynk",
    body: body.kind === "message" ? (spanish ? "Te envió un mensaje" : "Sent you a message") : (spanish ? `${senderName} te envió una solicitud de match` : `${senderName} sent you a match request`),
    tag: `blynk-${body.kind}-${body.referenceId}`,
    url: body.kind === "message" ? "/?tab=messages" : "/",
  });
  const { data: subscriptions } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", body.recipientId);
  configureWebPush();
  const results = await Promise.allSettled((subscriptions || []).map((subscription) => webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, { TTL: 60 * 60 * 4 })));
  const expiredIds = results.flatMap((result, index) => result.status === "rejected" && ((result.reason as { statusCode?: number })?.statusCode === 404 || (result.reason as { statusCode?: number })?.statusCode === 410) ? [subscriptions?.[index]?.id].filter(Boolean) : []);
  if (expiredIds.length) await admin.from("push_subscriptions").delete().in("id", expiredIds);
  return NextResponse.json({ ok: true, delivered: results.filter((result) => result.status === "fulfilled").length });
}
