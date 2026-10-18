type Props = {
  spanish: boolean; enabled: boolean; busy: boolean; supported: boolean; notice: string;
  onEnable: () => void; onDisable: () => void; onTest: () => void;
};

export default function PushSettings({ spanish, enabled, busy, supported, notice, onEnable, onDisable, onTest }: Props) {
  const messages: Record<string, [string, string]> = {
    enabled: ["Dispositivo registrado. Envía una prueba para comprobar la entrega.", "Device registered. Send a test to check delivery."],
    disabled: ["Notificaciones desactivadas en este dispositivo. Seguirán apagadas al volver a abrir Blynk.", "Notifications are off on this device and will stay off when you reopen Blynk."],
    permission: ["Permite las notificaciones de Blynk en los ajustes del navegador e inténtalo de nuevo.", "Allow Blynk notifications in your browser settings and try again."],
    server_setup: ["Falta completar la configuración de notificaciones del servidor.", "Notification server setup is incomplete."],
    device_save: ["No pudimos guardar este dispositivo. Revisa la configuración de Web Push en el servidor.", "We could not save this device. Check Web Push server setup."],
    push_database_setup: ["Falta preparar la tabla de dispositivos en Supabase. Ejecuta la migración 033 de Web Push.", "The device table needs setup in Supabase. Run Web Push migration 033."],
    push_database_access: ["El servidor no tiene permiso para guardar dispositivos. Revisa la migración 033 y la clave de servidor en Vercel.", "The server cannot save devices. Check migration 033 and the server key in Vercel."],
    push_server_key: ["Supabase rechazó la clave del servidor. Revisa SUPABASE_SERVICE_ROLE_KEY en Vercel.", "Supabase rejected the server key. Check SUPABASE_SERVICE_ROLE_KEY in Vercel."],
    push_project_mismatch: ["El servidor y tu cuenta no coinciden. Revisa que las variables de Supabase en Vercel sean del mismo proyecto.", "The server and account do not match. Check that Vercel Supabase variables belong to the same project."],
    device_missing: ["Este dispositivo no está registrado. Activa las notificaciones de nuevo.", "This device is not registered. Enable notifications again."],
    device_expired: ["El registro del dispositivo venció. Activa las notificaciones de nuevo.", "Device registration expired. Enable notifications again."],
    push_rejected: ["El servicio rechazó la prueba. Revisa las llaves VAPID del servidor.", "The push service rejected the test. Check the server VAPID keys."],
    test_sent: ["Prueba aceptada por el servicio de envío. Si no aparece, revisa los permisos de Chrome y las notificaciones de Android.", "Test accepted by the push service. If it does not appear, check Chrome permissions and Android notification settings."],
    sign_in: ["Inicia sesión de nuevo para registrar este dispositivo.", "Sign in again to register this device."],
    disable_failed: ["No se pudo completar la desactivación. Inténtalo de nuevo o desactiva el permiso en el navegador.", "Could not finish turning notifications off. Try again or disable permission in your browser."],
    device_error: ["No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.", "Could not connect. Check your connection and try again."],
    unsupported: ["Este navegador no admite Web Push. Prueba Chrome en Android.", "This browser does not support Web Push. Try Chrome on Android."],
  };
  const noticeText = messages[notice]?.[spanish ? 0 : 1] || notice;
  return <section className="blynk-card rounded-3xl p-5">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="font-black">{spanish ? "Notificaciones" : "Notifications"}</h2>
        <p className="mt-2 text-sm leading-6 text-white/55">{spanish ? "Avisos de mensajes y solicitudes en este dispositivo, incluso con Blynk en segundo plano." : "Message and match request alerts on this device, including while Blynk is in the background."}</p></div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${enabled ? "bg-emerald-400/15 text-emerald-100" : "bg-white/10 text-white/60"}`}>{enabled ? (spanish ? "Activo" : "On") : (spanish ? "Desactivado" : "Off")}</span>
    </div>
    {supported ? <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={enabled ? onDisable : onEnable} className="flex-1 rounded-xl border border-pink-300/30 bg-pink-400/10 px-4 py-3 text-sm font-bold text-pink-100 disabled:opacity-50">{busy ? (spanish ? "Procesando…" : "Working…") : enabled ? (spanish ? "Desactivar" : "Turn off") : (spanish ? "Activar notificaciones" : "Enable notifications")}</button>
      {enabled && <button type="button" disabled={busy} onClick={onTest} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold disabled:opacity-50">{spanish ? "Enviar prueba" : "Send test"}</button>}
    </div> : <p className="mt-3 text-sm text-white/60">{spanish ? "Este navegador no admite Web Push. Prueba Chrome en Android." : "This browser does not support Web Push. Try Chrome on Android."}</p>}
    {noticeText && <p role="status" className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm leading-6 text-white/80">{noticeText}</p>}
  </section>;
}
