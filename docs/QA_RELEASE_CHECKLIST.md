# Blynk — checklist de pruebas antes de publicar

Usa dos o tres cuentas de prueba y completa esta lista antes de invitar usuarios nuevos o publicar un cambio importante. No marques un punto como listo hasta comprobarlo en celular y, cuando aplique, en computadora.

## 1. Cuenta y acceso

- [ ] Crear una cuenta nueva, confirmar el correo y llegar al onboarding.
- [ ] Intentar iniciar sesión antes de confirmar el correo: debe bloquearse y explicar cómo reenviar la confirmación.
- [ ] Usar **Forgot password** y cambiar la contraseña desde el enlace recibido.
- [ ] Intentar registrarse con fecha de nacimiento menor de 18 años: debe impedirse.
- [ ] Cerrar sesión e iniciar con la contraseña nueva.

## 2. Perfil y Descubrir

- [ ] Completar nombre, usuario, ciudad, intención, intereses y biografía.
- [ ] Subir foto de perfil, foto de fondo, galería y video de presentación.
- [ ] Confirmar que la vista pública no muestra correo electrónico ni ubicación exacta.
- [ ] En Descubrir, comprobar que el corazón queda arriba a la derecha y los tres puntos de seguridad debajo.
- [ ] Probar like, pasar al siguiente perfil y filtros de ciudad/rango.

## 3. Solicitudes, matches y mensajes

- [ ] Cuenta A envía una solicitud a Cuenta B.
- [ ] Cuenta B recibe una sola tarjeta de solicitud, sin avisos duplicados.
- [ ] Cuenta B revisa el perfil y acepta; ambas cuentas ven una única conversación.
- [ ] Enviar mensajes desde ambas cuentas.
- [ ] Confirmar un punto negro al enviar y dos puntos verdes solo después de que el receptor abra el chat.
- [ ] Confirmar que una conversación no se duplica si se intenta hacer match otra vez.

## 4. Notificaciones

- [ ] Activar permiso de notificaciones en cada navegador/dispositivo de prueba.
- [ ] Probar mensaje, solicitud de match y aviso de seguridad.
- [ ] Confirmar que la notificación muestra el ojo de Blynk y el nombre de la persona.
- [ ] Probar con la otra cuenta cerrada o en segundo plano, según soporte del navegador.

## 5. Seguridad y moderación

- [ ] Reportar un perfil e indicar un motivo.
- [ ] Bloquear un perfil: no debe aparecer de nuevo ni permitir mensajes.
- [ ] Abrir Admin con una cuenta administradora y revisar el reporte.
- [ ] Suspender, restaurar y responder una solicitud de revisión.
- [ ] Confirmar que la cuenta suspendida no puede enviar mensajes, solicitar matches ni aparecer en Descubrir.

## 6. Publicación

- [ ] Ejecutar `npx tsc --noEmit --incremental false` sin errores.
- [ ] Ejecutar `npm run lint`; revisar que no aparezcan errores nuevos.
- [ ] Ejecutar las pruebas anteriores en teléfono y computadora.
- [ ] Confirmar que Vercel terminó el despliegue y abrir `https://blynk-beta.vercel.app/` en una ventana privada.
- [ ] Revisar Privacy Policy, Terms y Community Guidelines con los datos reales antes de abrir la app al público.

## Si algo falla

1. No publiques otro cambio todavía.
2. Anota la cuenta, pantalla, pasos exactos y mensaje de error.
3. Toma una captura y compártela para corregir una sola causa a la vez.
