# Progreso de Blynk

Última actualización: 15 de septiembre de 2026.

## Ya implementado

- Registro e inicio de sesión con Supabase Auth.
- Perfiles con foto, galería, video de presentación y foto de fondo.
- Descubrir perfiles con video o foto si no existe video.
- Solicitudes de match, aceptación/rechazo y prevención de solicitudes duplicadas.
- Mensajes visibles cuando existe un mensaje recibido de un match.
- Comunidad con publicaciones, video, likes y comentarios.
- Idioma inglés como predeterminado; selector ES/EN en la app.
- Logo del ojo Blynk en la barra y en la pantalla de acceso.
- Onboarding original para cuentas nuevas: nombre, usuario, fecha de nacimiento, ciudad, pronombres, intención, intereses y biografía.

## Migraciones de Supabase

Ejecutar una sola vez, en orden, desde `supabase/migrations/`:

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

## Configuración de producción

En Supabase, Authentication > URL Configuration:

- Site URL: `https://blynk-beta.vercel.app`
- Redirect URLs:
  - `https://blynk-beta.vercel.app/**`
  - `http://localhost:3000/**`
  - `https://*-acme-1232.vercel.app/**`

En Vercel deben existir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` para Production. Cada cambio de variables requiere redeploy.

## Próximos pasos recomendados

- Completar las traducciones ES/EN restantes con un diccionario único.
- Hacer que el filtro Cerca use ciudad y rango configurados por cada perfil.
- Conectar el corazón de Descubrir a `profile_likes` y mostrar el contador real.
- Añadir edición de todos los datos del onboarding desde Perfil.
- Configurar SMTP propio para entrega confiable de correos de confirmación.

## Publicar cambios

Desde `C:\Users\herna\blynk`:

```powershell
git add app/login/page.tsx docs/PROGRESO_BLYNK.md
git commit -m "Guarda progreso y aviso en ingles"
git push origin main
```

No agregar `.npm-cache`.
