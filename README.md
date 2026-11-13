# Brandgo Documentos

Herramienta del equipo para crear documentos con la línea gráfica de Brandgo.
En línea: https://cotizador-brandgo.vercel.app

Al entrar aparece la pregunta **«¿Qué necesitas hoy?»** con cuatro tareas:

## 1. Cotizar una campaña (`cotizador.html`)
Propuesta comercial paso a paso → PDF en formato presentación 16:9.
1. **Cliente** y encabezado de la portada.
2. **Servicios**: activa, ordena o agrega servicios (vienen con texto de ejemplo).
3. Un paso por servicio: título, color, puntos, entregables con cantidad, notas y quién del equipo aparece.
4. **Equipo**: `[corchetes]` resaltan palabras y `**asteriscos**` ponen negrita.
5. **Inversión** y **Descargar PDF**.

## 2. Crear una cuenta de cobro (`cuenta-de-cobro.html`)
Cuenta de cobro paso a paso → PDF tamaño **carta o A4**.
1. **Encabezado**: título, número consecutivo (se sugiere solo), ciudad y fecha.
2. **Quién cobra**: nombre o razón social, documento y contacto.
3. **Cliente**: nombre o razón social, documento, dirección. Los clientes se guardan al descargar.
4. **Servicios**, cada uno en su tarjeta de color:
   - **Marketing mensual**: título del plan, qué trae y precio. Los planes se pueden guardar y elegir en cada cuenta.
   - **Diseño** y **Producción**: nombre del trabajo, detalle y precio.
   - **Campaña de marketing**: entregables con cantidad y precio.
   - **Otro servicio**: formulario abierto.
   El total y el valor en letras se calculan solos.
5. **Datos de pago**: banco, tipo y número de cuenta, u otros medios.
6. **Firma**: se dibuja con el dedo o el mouse, o se sube una imagen. Debajo van el nombre y la cédula.

Avatares en las tarjetas: marketing mensual y campañas muestran a todo el equipo; diseño a Juca; producción a Mauro;
en «otro servicio» se eligen según el contenido (estrategia y gestión → Camilo, Laura y Malu). Se pueden cambiar a mano.

Todo se guarda solo en el navegador de cada persona (borrador, datos de quien cobra, planes, clientes y consecutivo).

## 3. Finanzas de la agencia (`finanzas.html`) — acceso restringido
Solo entra quien tenga una cuenta autorizada (correo y contraseña). Los datos viven en Supabase, protegidos por reglas de acceso de la base de datos; ver **FINANZAS-SEGURIDAD.md** para configurarlo.
- **Meses:** primera vista. Balance de cada mes en tarjetas (facturado, nómina, otros gastos y neto) con su meta de facturación y un anillo de avance.
- **Accesos rápidos:** Registrar pago, Registrar gasto y Pagar nómina, cada uno con su ícono.
- **Pagos:** un cobro por cliente y mes, con abonos (50% + 50%, o lo que pague). El estado se calcula solo: Pagado, En proceso o Pendiente. Botón para generar los cobros del mes de todos los clientes de marketing mensual.
- **Gastos:** categorías con abreviatura — GH gasto hormiga, SE servicios, IN insumos, PR préstamo, AL alquiler, EQ equipos, SU suscripción. Los préstamos pueden salir o entrar a Brandgo; los que entran no cuentan como gasto.
- **Nómina:** cada persona del equipo con su avatar, salario y estado del mes. Se paga por quincenas (50% el día 15 y el resto después); el estado se calcula solo. Botón para agregar a todo el equipo al mes.
- **Clientes:** perfil con categoría (MM marketing mensual, CP campaña, SV servicio), valor, día de pago, plan y datos para la cuenta de cobro.
- **Apariencia:** interruptor claro, oscuro o automático en todas las páginas. Los PDF siempre salen en claro.
- **Conexiones:** una cotización aprobada crea el cliente y su cobro en Finanzas; desde un cobro se genera la cuenta de cobro ya llena y, al descargarla, queda anotada en el pago.
- **Registrado por:** cada pago, gasto y nómina muestra quién lo registró o editó por última vez.
- **Resumen:** saldo neto (facturado − nómina − gastos), lo recibido, lo que falta por cobrar, gráficas por categoría y exportación a PDF.

## 4. Guiones de rodaje (`guiones.html`)
Organizados por **cuenta** (cliente). Dentro de cada cuenta están sus guiones y se crean nuevos.
1. Se pega el guion escrito y la IA (Claude, en `api/guion.js`) lo convierte en un guion técnico: entrevistas, tomas de apoyo, montajes y cierre, agrupados por ubicación.
2. Checklist con avance en vivo: si alguien marca una toma desde otro celular, se ve al instante.
3. **Enlace de rodaje:** versión limpia solo para marcar, para compartir con el equipo en el set.
- Acceso abierto (sin cuenta) para el equipo; en la base no se puede borrar, solo archivar.
- Requiere `supabase/guiones.sql` y la variable `ANTHROPIC_API_KEY` en Vercel.

## Para el equipo técnico
- `index.html`: inicio. `styles.css`: estilos compartidos (web, diapositivas y documento).
- `app.js`: cotizador. `cobro.js`: cuentas de cobro. `finanzas.js`: finanzas. `common.js`: utilidades compartidas y número a letras.
- `supabase/finanzas.sql`: tablas y reglas de acceso. `supabase/metas.sql`, `nomina.sql`, `avatares.sql`, `conexiones.sql` y `campanas.sql`: actualizaciones para el proyecto ya creado (en ese orden). `finanzas-config.js`: URL y clave pública de Supabase. `vercel.json`: cabeceras de seguridad.
- Para probar Finanzas en local sin base de datos: `http://localhost:<puerto>/finanzas.html?demo` (solo funciona en localhost).
- Si cambias fotos en `assets/`, regenera `assets.js` con `node build-assets.cjs`.
- Cada cambio que se sube a `main` se publica solo en Vercel.
