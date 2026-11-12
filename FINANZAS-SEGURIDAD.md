# Finanzas: cómo dejarlo seguro, paso a paso

## Cómo funciona la seguridad

- **La página `finanzas.html` no guarda ni trae datos por sí sola.** Su código es público (está en este repositorio), pero no contiene ninguna cifra.
- **Los datos viven en Supabase**, una base de datos en la nube con inicio de sesión.
- **Para leer o escribir hay que iniciar sesión con correo y contraseña**, y además estar en la lista `miembros`. Esa regla la aplica la base de datos misma (Row Level Security), no la página. Aunque alguien copie el código o la clave pública, no puede ver nada sin una cuenta autorizada.
- **Nadie puede registrarse solo.** Las cuentas las creas tú desde el panel de Supabase.
- **La sesión se cierra sola** al cerrar el navegador o tras 20 minutos sin actividad.
- **Todo viaja cifrado (HTTPS)**, y el sitio envía cabeceras que impiden incrustarlo en otras páginas y que lo indexen los buscadores.

## Lo que tienes que hacer (una sola vez, unos 15 minutos)

1. **Crea la cuenta y el proyecto.** Entra a https://supabase.com, regístrate (puedes usar tu cuenta de GitHub) y crea un proyecto nuevo:
   - Nombre: `brandgo-finanzas`.
   - Región: **South America (São Paulo)**.
   - Contraseña de la base de datos: una contraseña larga, guardada en tu gestor de contraseñas. No la vas a necesitar en la web.
2. **Crea las tablas y las reglas de acceso.**
   - En el menú izquierdo entra a **SQL Editor** → **New query**.
   - Pega todo el contenido de `supabase/finanzas.sql` y oprime **Run**.
   - Debe decir "Success. No rows returned".
3. **Cierra el registro público.** En **Authentication** → **Sign In / Providers**, apaga **Allow new users to sign up**. Deja activo el proveedor **Email**.
4. **Sube la exigencia de las contraseñas.** En **Authentication** → **Sign In / Providers** → **Email**:
   - Pon la longitud mínima en **12**.
   - Exige minúsculas, mayúsculas, números y símbolos.
5. **Crea las cuentas autorizadas.**
   - En **Authentication** → **Users** → **Add user** → **Create new user**, escribe el correo y una contraseña fuerte.
   - Marca **Auto Confirm User**.
   - Repite para cada persona que deba ver las finanzas.
6. **Dales acceso a Finanzas.** Vuelve a **SQL Editor**, cambia los correos por los reales y ejecuta:
   ```sql
   insert into public.miembros (user_id, email)
   select id, email from auth.users where email in ('correo1@ejemplo.com', 'correo2@ejemplo.com')
   on conflict (user_id) do nothing;
   ```
   Para quitarle el acceso a alguien:
   ```sql
   delete from public.miembros where email = 'correo@ejemplo.com';
   ```
   También puedes borrar su usuario en Authentication → Users.
7. **Indica la dirección del sitio.** En **Authentication** → **URL Configuration**, pon en **Site URL**: `https://cotizador-brandgo.vercel.app`.
8. **Pásame los dos datos de conexión.**
   - Están en **Project Settings** → **API**: **Project URL** y la clave **anon public**.
   - Esas dos son públicas por diseño, y yo las pongo en `finanzas-config.js`.
   - **Nunca compartas la clave `service_role`**: esa sí salta todas las reglas.
9. **(Opcional) Carga octubre.** En SQL Editor, corre el archivo `finanzas-privado/octubre-2026.sql`.
   - Está en tu computador, fuera del repositorio. Tiene los datos de octubre exportados de Notion.
   - Córrelo una sola vez: si lo corres dos veces, duplica los datos.

## Buenas prácticas

- **Una cuenta por persona.** Nunca compartan contraseñas: así se puede quitar el acceso a alguien sin afectar a los demás.
- **Revisa cada tanto la lista de usuarios** en Authentication → Users.
- **El plan gratuito de Supabase pausa el proyecto** si pasa una semana sin uso. Se reactiva desde el panel y no se pierden los datos.
- **Respaldos:** revisa en **Database** → **Backups** qué incluye tu plan. Para tener respaldos diarios garantizados, el plan Pro los incluye.
- **Siguiente nivel, si lo quieres:** un segundo factor con una app de códigos (Google Authenticator, 1Password) al entrar. Supabase lo soporta y se puede agregar a esta misma pantalla de acceso.
