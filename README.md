# Brandgo Documentos

Herramienta del equipo para crear documentos con la línea gráfica de Brandgo.
En línea: https://cotizador-brandgo.vercel.app

Al entrar aparece la pregunta **«¿Qué necesitas hoy?»** con dos tareas:

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

## Para el equipo técnico
- `index.html`: inicio. `styles.css`: estilos compartidos (web, diapositivas y documento).
- `app.js`: cotizador. `cobro.js`: cuentas de cobro. `common.js`: utilidades compartidas y número a letras.
- Si cambias fotos en `assets/`, regenera `assets.js` con `node build-assets.js`.
- Cada cambio que se sube a `main` se publica solo en Vercel.
