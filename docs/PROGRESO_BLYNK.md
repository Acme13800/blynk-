# Progreso de Blynk

Última actualización: 3 de noviembre de 2026.

## Punto de continuación — 3 de noviembre de 2026

El usuario pidió guardar y detener el trabajo aquí.

### Seguridad: resultados confirmados mediante capturas del usuario

- El correo de Supabase alertaba de RLS desactivada. La consulta encontró
  `posts` (3 políticas) y `profiles` (4 políticas) con RLS desactivada.
- Se ejecutó 034: ambas tablas muestran RLS `true`. Se conservaron los datos y
  las políticas. No afirmar que esto completa una auditoría de columnas privadas.
- El usuario exportó las 15 advertencias del Security Advisor para revisión.
- Se ejecutó 035: acceso a swipes limitado al dueño por swiper_id; listado
  público de blynk-media reemplazado por lectura de la carpeta del dueño;
  permisos RPC directos de funciones internas retirados. La captura confirmó
  false/false en tres funciones trigger, e is_blynk_admin anon=false/auth=true.
- Se ejecutó 036: cinco funciones privilegiadas movidas a blynk_private,
  preservando las funciones originales y dependencias de RLS; referencias de
  funciones trigger redirigidas. Solo public.blynk_can_contact permanece como
  wrapper SECURITY INVOKER para la llamada RPC existente de la app.
- La captura final del Security Advisor muestra 0 errores, 1 advertencia y
  1 sugerencia informativa. No equivale a certificación integral de seguridad.

### Advertencia e información restantes

- Leaked Password Protection Disabled: requiere activar protección en Supabase
  Pro o superior. El proyecto sigue en Free. No se cambió el plan ni se activó.
- RLS Enabled No Policy en public.push_subscriptions: intencional, tabla privada
  gestionada por servidor con service_role. No otorgar acceso directo a anon o
  authenticated ni desactivar RLS para eliminar esta información.

### Archivos locales que deben guardarse en Git

- supabase/migrations/034_restore_posts_profiles_rls.sql
- supabase/migrations/035_security_advisor_hardening.sql
- supabase/migrations/036_private_security_helpers.sql
- docs/SECURITY_ADVISOR_REVIEW.md
- Este resumen, docs/PROGRESO_BLYNK.md.

### Retomar en este orden

1. Probar perfil, publicación/subida de foto, mensaje, bloqueo/desbloqueo y
   Admin tras 036. Las pruebas posteriores a los cambios aún no se confirmaron.
2. Confirmar en Data API Exposed schemas que blynk_private NO esté expuesto.
   La migración comprueba el setting SQL cuando está disponible, pero no se
   inspeccionó directamente la configuración del Dashboard.
3. Resolver Web Push: sigue pendiente SUPABASE_SERVICE_ROLE_KEY rechazada en
   Vercel. Reemplazarla privadamente con una clave válida del mismo proyecto,
   redeploy y probar Enable notifications / Send test en Android. Nunca pedir
   que se pegue una clave en el chat.
4. Pendientes de privacidad para lanzamiento: adjuntos del chat siguen usando
   enlaces de bucket público; planificar almacenamiento privado y autorización
   sin romper los enlaces existentes. Revisar columnas expuestas de profiles.
5. Seguir QA_RELEASE_CHECKLIST.md y completar eliminación segura de cuenta y
   datos, textos legales reales y revisión final de traducciones.

No volver a ejecutar migraciones antiguas 009–035 después de 036 sin adaptarlas:
referencian funciones públicas que ahora son privadas y podrían recrear accesos.
Las correcciones actuales fueron SQL; no requieren despliegue de Vercel para
entrar en vigor. Guardar las migraciones en Git conserva el registro.

## Registro anterior

## Punto de continuación — 17 de octubre de 2026

El usuario pidió detener el trabajo aquí y retomarlo después.

### Confirmado por el usuario

- Se pudo reportar un perfil, revisar el motivo en Admin y suspender la cuenta.
- Funcionó el recorrido de solicitud de revisión, aprobación y restauración.
- Prueba en Android: no llegó la notificación en segundo plano. Web Push sigue pendiente; no marcarlo como resuelto.

### Implementado y registrado en Git

- `c376fee`: controles de activar, desactivar y enviar prueba en Perfil; desactivación persistente en este navegador; registro real del dispositivo determina el estado On/Off.
- `006ec47`: migración `033_push_server_access.sql` para tabla privada de dispositivos y permisos de `service_role`; diagnóstico del fallo de registro con categorías seguras.
- Nuevo componente `app/components/PushSettings.tsx`, endpoint de prueba `app/api/push/test/route.ts` y DELETE en `app/api/push/subscribe/route.ts`.
- Revisión de configuración completa del servidor; recuperación de suscripciones ante cambio de llave pública VAPID.
- TypeScript y ESLint pasaron durante la implementación. La entrega real no se ha validado en Android.
- Al revisar antes de guardar estas notas, HEAD y la referencia local origin/main coincidían en `006ec47`. No se hizo fetch ni auditoría directa de Vercel.

### Bloqueo actual y primer paso al volver

La captura más reciente muestra: `Supabase rejected the server key. Check SUPABASE_SERVICE_ROLE_KEY in Vercel.`

El proceso llega al servidor pero Supabase rechaza la credencial del servidor. No continuar modificando SQL o interfaz sin atender este diagnóstico. No se inspeccionaron ni guardaron valores de claves en estas notas.

1. Abrir API Keys del proyecto Supabase `nykhmbvmjrnxfdhaulyx`.
2. El usuario debe copiar una clave Secret válida o la service_role antigua de ese mismo proyecto, sin compartirla en el chat.
3. En Vercel, proyecto Blynk, Settings > Environment Variables, reemplazar `SUPABASE_SERVICE_ROLE_KEY` para Production. Esta variable es privada del servidor; nunca usar un prefijo NEXT_PUBLIC.
4. Hacer Redeploy del despliegue de producción para aplicar la variable.
5. En Android, abrir Blynk > Perfil > Enable notifications. Cuando registre el dispositivo, pulsar Send test.
6. Si la prueba llega, probar un mensaje de otra cuenta con Blynk en segundo plano, verificar apagado/encendido y persistencia al recargar.

Enlaces: https://supabase.com/dashboard/project/nykhmbvmjrnxfdhaulyx/settings/api-keys y https://blynk-beta.vercel.app/.

Después de resolver Web Push, continuar los pendientes de lanzamiento indicados en el registro anterior y en `docs/QA_RELEASE_CHECKLIST.md`.

## Registro anterior

## Punto de continuación — 16 de octubre de 2026

### Cambios guardados en código

- Encabezado con ojo centrado y marca pequeña a la izquierda; herramientas del perfil reorganizadas.
- Una sola tarjeta de solicitud de match, sin el aviso flotante duplicado.
- Descubrir: swipe hacia arriba para avanzar y hacia abajo para volver; flechas del teclado en computadora. El swipe ya no guarda un descarte.
- Descubrir conectado a Supabase muestra perfiles registrados, sin sustituir una lista vacía por perfiles ficticios.
- Corazón y menú de seguridad alineados a la derecha; texto y botones separados en móvil.
- Calendario de nacimiento con contraste oscuro y un área de toque más visible.
- Dos puntos verdes de leído más juntos.
- Avisos de envío integrados dentro del chat y avisos generales con estilo oscuro.
- Migración 031: permisos de bloqueo, incluido UPDATE para upsert.
- Migración 032: impide nuevos mensajes y solicitudes entre cuentas bloqueadas en cualquiera de las dos direcciones; conserva el historial. Comprobación previa en el chat y filtro de bloqueos en Web Push.

### Pruebas confirmadas por el usuario

- Registro y confirmación de correo.
- Campo/calendario de fecha de nacimiento.
- Recuperación de contraseña.
- Bloqueo: tras corregir los permisos y las validaciones, el usuario confirmó la prueba de envío restringido.
- Presentación de avisos actualizada.
- Desbloqueo y regreso a la conversación: usuario indicó «listo» tras los pasos; conviene repetirlo en la revisión final.

Estas confirmaciones son pruebas manuales del usuario. No se auditó directamente el estado remoto de Supabase ni el despliegue de Vercel en esta sesión.

### Siguiente sesión

1. Probar reportar un perfil con motivo y revisar el reporte desde la cuenta administradora.
2. Probar suspensión, solicitud de revisión, respuesta y restauración con dos cuentas.
3. Continuar la lista `docs/QA_RELEASE_CHECKLIST.md` y comprobar Web Push con dispositivos distintos.
4. Pendientes para lanzamiento: eliminación segura de cuenta y datos; completar los datos reales de las páginas legales y revisar sus textos; auditoría de permisos y traducciones.

Punto de referencia del código antes de este resumen: `5cbf839` — `Polish chat notices and notifications`.

## Registro histórico — septiembre de 2026

Las secciones siguientes conservan las notas originales; algunos pendientes históricos ya se implementaron. Usar el punto de continuación anterior como estado más reciente.

## Implementado y funcional

- Registro e inicio de sesión con Supabase Auth y confirmación de correo configurada para localhost y producción.
- Onboarding propio para cuentas nuevas: nombre, usuario, fecha de nacimiento (18+), ciudad, pronombres, intención, intereses y biografía.
- Perfil editable por cuenta: nombre, usuario, ciudad, intención, intereses, biografía, foto de perfil, foto de fondo, galería y video de presentación.
- Descubrir perfiles con video de presentación o foto si no existe video.
- Likes reales por perfil con contador y opción de quitar el like.
- Filtros de Descubrir por ciudad, edad, intención e intereses. La pestaña Cerca usa la ciudad del perfil y no muestra ubicación exacta.
- Solicitudes de match, aceptación/rechazo, revisión de perfil y prevención de matches duplicados.
- Mensajes entre matches, bandeja profesional, hora, indicador de leído/no leído y conversaciones visibles al recibir el primer mensaje.
- Comunidad: publicaciones con video, likes, comentarios, respuestas y menú por comentario para copiar, ocultar, borrar, reportar y bloquear.
- Comentarios activables o desactivables por publicación.
- Idioma inglés como predeterminado y selector ES/EN.
- Logo del ojo Blynk en la barra y acceso.

## Migraciones de Supabase

Los archivos están en `supabase/migrations/`. Cada uno se ejecuta una sola vez en Supabase SQL Editor:

1. `002_blynk_media_storage.sql`
2. `003_posts_permissions.sql`
3. `004_profiles_permissions.sql`
4. `005_community_interactions.sql`
5. `006_matches_and_messages.sql`
6. `007_profile_media.sql`
7. `008_presentation_videos.sql`
8. `009_messages_match_policy.sql`
9. `010_profile_cover_and_discovery.sql`
10. `011_profile_onboarding.sql`
11. `012_message_read_receipts.sql`
12. `013_comment_moderation.sql`

## Producción

- Producción: `https://blynk-beta.vercel.app`
- En Vercel deben existir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Production.
- En Supabase, Authentication > URL Configuration debe incluir:
  - `https://blynk-beta.vercel.app/**`
  - `http://localhost:3000/**`
  - `https://*-acme-1232.vercel.app/**`

## Próximos pasos recomendados

1. Eliminar cuenta y datos personales con confirmación segura.
2. Compartir fotos y videos cortos dentro de los mensajes.
3. Notificaciones en tiempo real para matches, mensajes y actividad de Comunidad.
4. Vista previa pública del perfil y controles de visibilidad individuales por foto/video.
5. Páginas legales: Privacidad, Términos y Normas de Comunidad.
6. Límites, compresión y validación de archivos para prevenir abuso.
7. Pruebas con varias cuentas antes de invitar usuarios reales.

## Cómo guardar cambios futuros

Desde `C:\Users\herna\blynk`, agrega solo los archivos modificados. Por ejemplo:

```powershell
git add app/page.tsx docs/PROGRESO_BLYNK.md
git commit -m "Save Blynk progress"
git push
```

No usar `git add .` y no agregar `.npm-cache`.
