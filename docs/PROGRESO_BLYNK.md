# Progreso de Blynk

Última actualización: 21 de septiembre de 2026.

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
