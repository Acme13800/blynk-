import { NextResponse } from "next/server";
import webpush from "web-push";
import { configureWebPush, getPushUser, getServiceSupabase, hasPushServerConfig } from "@/lib/push-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasPushServerConfig()) return NextResponse.json({ error: "server_setup" }, { status: 503 });
  const user = await getPushUser(request);
  if (!user) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const body = await request.json().catch(() => null) as { endpoint?: string; language?: string } | null;
  if (!body?.endpoint) return NextResponse.json({ error: "device_missing" }, { status: 400 });
  const admin = getServiceSupabase();
  const { data: device, error } = await admin.from("push_subscriptions")
    .select("id, endpoint, p256dh, auth").eq("user_id", user.id).eq("endpoint", body.endpoint).maybeSingle();
  if (error) return NextResponse.json({ error: "device_save" }, { status: 500 });
  if (!device) return NextResponse.json({ error: "device_missing" }, { status: 404 });
  try {
    configureWebPush();
    await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify({
      title: "Blynk", body: body.language === "es" ? "Las notificaciones de prueba funcionan en este dispositivo." : "Test notifications work on this device.",
      tag: "blynk-test", url: "/?tab=profile",
    }), { TTL: 60 });
    return NextResponse.json({ ok: true });
  } catch (cause) {
    const status = (cause as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", device.id);
    return NextResponse.json({ error: status === 404 || status === 410 ? "device_expired" : "push_rejected" }, { status: 502 });
  }
}
