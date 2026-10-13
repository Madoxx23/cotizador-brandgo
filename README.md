# Cotizador de campañas — Brandgo

Abre `index.html` en el navegador (doble clic). Funciona sin instalar nada; solo necesita internet
para cargar la tipografía y las librerías del PDF.

## Cómo se usa
1. **Cliente**: nombre de la marca y encabezado de portada.
2. **Servicios**: activa, ordena o agrega servicios (vienen con texto de ejemplo).
3. Un paso por servicio: título, color, puntos, entregables con cantidad, notas y quién del equipo aparece.
   - `Enter` crea un punto nuevo. Puedes pegar una lista completa y se separa sola.
4. **Equipo**: diapositiva de presentación. `[corchetes]` resaltan palabras y `**asteriscos**` ponen negrita.
5. **Inversión** y **Descargar PDF** (16:9, igual a la vista previa).

El borrador se guarda solo en el navegador de cada persona. «Nueva cotización» vuelve a la plantilla base.

## Para el equipo técnico
- `app.js`: preguntas, plantillas de servicios (`CATALOG`), equipo (`TEAM`) y armado de diapositivas.
- `index.html`: estilos de la web y de las diapositivas.
- Si cambias fotos en `assets/`, regenera `assets.js` con `node build-assets.js`.
- Para compartirlo por enlace, sube la carpeta (sin `assets/` ni `build-assets.js`) a Netlify, Vercel o GitHub Pages.
