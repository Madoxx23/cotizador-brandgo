# Línea gráfica de la web de Brandgo

Guía de diseño de las herramientas internas (Brandgo Documentos). **El módulo de Finanzas es la referencia.** Todo lo nuevo que se construya debe seguir estos parámetros.

El estilo es de producto de software: limpio, compacto y ordenado, inspirado en Attio. La interfaz es casi monocromática y el color aparece solo en acentos pequeños.

> **Qué no cambia:** el logo, los avatares del equipo, los íconos 3D de las herramientas, la marca BRANDGO™ y el sello «Creatividad Sin Permiso». Los **PDF** (cotización 16:9 y cuenta de cobro) conservan su propia línea gráfica: Plus Jakarta Sans, fondo de puntos y tarjetas pastel.

Todo vive en `diseno.css`, que se carga después de `styles.css` en cada página.

---

## 1. Principios

1. **Un solo estándar.** Todos los botones miden lo mismo, todas las tarjetas tienen el mismo radio, y los textos siguen siempre el mismo orden.
2. **Monocromático con acentos.** Fondos blancos y grises muy claros, y texto casi negro. El color solo aparece en estados, etiquetas, íconos y el botón principal.
3. **Bordes antes que sombras.** Los bordes son de 1 px. La sombra es mínima y solo separa.
4. **Compacto y cerrado.** La información va bien agrupada dentro de tarjetas, con aire interior, y ningún texto toca un borde.
5. **Nada de degradados, brillos ni fondos de color grandes.**

---

## 2. Tipografía

| Uso | Tamaño | Peso | Color |
|---|---|---|---|
| Título de página (`.q`) | 24–30 px | 600 | Texto |
| Título de sección (`.fin-h2`) | 20 px | 600 | Texto |
| Título de tarjeta u hoja | 15–18 px | 600 | Texto |
| Texto normal | 14–14.5 px | 400 | Texto |
| Rótulo (`.label`, encabezados de tabla) | 13–13.5 px | 500 | Gris |
| Metadatos y ayudas | 12.5–13 px | 400 | Gris claro |

- **Fuente:** Inter (Google Fonts), con `font-feature-settings: "cv11", "ss01"` y números tabulares (`tabular-nums`) en toda la web.
- **Interletrado:** −0.006em en el cuerpo y entre −0.02 y −0.035em en los títulos.
- **Solo los pesos 400, 500 y 600.** No se usan 700 ni 800.
- **Orden de los textos:** un rótulo gris pequeño, luego el título en negro y luego la descripción en gris. Ejemplo: «Finanzas Brandgo» → «¿Qué vas a registrar hoy?» → explicación.

---

## 3. Color

### Neutros

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#F7F7F8` | `#0B0C0E` | Fondo de la página |
| `--paper` | `#FFFFFF` | `#111214` | Tarjetas, tablas y hojas |
| `--subtle` | `#FAFAFB` | `#15161A` | Hover de filas y pies de hoja |
| `--track` | `#F2F2F4` | `#1A1B1F` | Fondo de controles y hover de botones sin borde |
| `--ink` | `#1C1D1F` | `#E8EAED` | Texto principal |
| `--ink-2` | `#6B6F76` | `#9EA2A9` | Rótulos y texto secundario |
| `--ink-3` | `#9A9DA3` | `#6B6F76` | Metadatos e íconos |
| `--line` | `#E8E9EC` | `#222429` | Bordes |
| `--line-2` | `#DCDDE1` | `#2C2F35` | Bordes más marcados |

### Acento

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--primary` | `#0071E3` (azul Apple) | `#E8EAED` (botón claro) | Botón principal |
| `--brand` | `#0071E3` | `#4C8DFF` | Casillas marcadas, foco y barras de avance |

En modo claro **no se usan botones negros**.

### Paleta pastel (etiquetas, botones de color y estados)

Cada color tiene tres valores: texto (`--p-x`), fondo (`--p-x-bg`) y borde (`--p-x-bd`).

| Color | Texto | Fondo | Borde | Uso típico |
|---|---|---|---|---|
| Verde | `#1A8A4E` | `#E6F7EC` | `#C3EBD1` | Pagado, éxito, nómina |
| Azul | `#2F6BDE` | `#EEF4FE` | `#BDD2FA` | Pagos, marketing mensual |
| Violeta | `#6646D6` | `#F2EEFE` | `#DCD2FB` | Gastos |
| Amarillo | `#7A6500` | `#FEF8D9` | `#F4E18E` | En proceso |
| Rosa | `#C2309F` | `#FCEBFA` | `#F3C7EB` | Pendiente, evitar |
| Naranja | `#E2561F` | `#FFF0E8` | `#FBD5C2` | Campañas, producción |
| Turquesa | `#0E7C8F` | `#E6F6F8` | `#BCE3EA` | Servicios |

El modo oscuro tiene su propia versión de cada color, más profunda, con el estilo de GitHub.

---

## 4. Medidas

| Elemento | Valor |
|---|---|
| Alto de botones, campos y pestañas | **32 px** (`--h-ctl`); 28 px dentro de barras de pestañas |
| Radio de tarjetas, tablas, hojas y paneles | **12 px** (`--r-card`) |
| Radio de botones, campos y pestañas | **8 px** |
| Radio de etiquetas pastel | **6 px** |
| Radio de los cuadritos de número (01, 02…) | 6 px |
| Relleno de tarjeta | 14–16 px |
| Separación entre tarjetas | 12–16 px |
| Barra lateral | 224 px de ancho |
| Borde | 1 px |

### Sombras

- `--shadow-sm`: `0 1px 2px rgba(16,24,40,.05)`. Tarjetas y tablas.
- `--shadow-md`: la anterior más `0 4px 12px rgba(16,24,40,.06)`. Hover de tarjetas.
- `--shadow-lg`: hojas y menús flotantes.
- **Botones:** borde casi invisible (`--btn-bd`: `rgba(16,24,40,.09)`) más una sombra suave (`--btn-shadow`). Es la sombra la que los separa del fondo, no la línea.

---

## 5. Componentes

### Botones (`.btn`)
Todos miden 32 px, con texto de 13.5 px en peso 500, radio de 8 px e ícono de línea de 15 px opcional.

| Variante | Aspecto | Cuándo |
|---|---|---|
| `.btn` | Blanco, borde suave y sombra | Acciones normales (Editar, Abonar, Filtros) |
| `.btn.primary` | Azul Apple con texto blanco | **Una sola** acción principal por vista |
| `.btn.tint` + color | Fondo pastel, borde del mismo tono, texto e ícono de color | Acciones principales de un módulo, como «Registrar pago» (azul), «Registrar gasto» (violeta) y «Pagar nómina» (verde) |
| `.btn.ghost` | Sin fondo ni borde | Acciones secundarias (Cancelar, Inicio) |

Para el botón de color se pasa el color con variables:

```js
h('button', { class: 'btn tint', style: { '--c': 'var(--p-azul)', '--c-bg': 'var(--p-azul-bg)', '--c-bd': 'var(--p-azul-bd)' } }, icon('cobrar'), 'Registrar pago')
```

### Estados (`.fin-st`)
Tienen el mismo aspecto que un botón blanco de 26 px, con un **punto de color** delante del texto: verde para Pagado, amarillo para En proceso y rojo para Pendiente. No son píldoras de color.

### Etiquetas de categoría (`.fin-chip`)
Fondo pastel, borde y texto del mismo tono, 24 px de alto y radio de 6 px. Llevan solo el nombre, sin abreviaturas.

### Pestañas y filtros (`.fin-tabs`, `.seg`)
Van dentro de una tarjeta blanca con radio de 12 px y 3 px de relleno. Cada opción mide 28 px y tiene un ícono de línea de 16 px más el texto. La opción activa es blanca, con borde suave y sombra, igual que un botón. **Pestañas y filtros se ven idénticos.**

### Tablas (`.fin-table`)
- Van en un contenedor blanco con borde de 1 px, radio de 12 px y sombra mínima.
- **El encabezado** lleva un ícono gris de 15 px y el nombre de la columna en 13.5 px, peso 500.
- **Filas de 40 px**, con líneas verticales de 1 px entre columnas y hover en `--subtle`.
- **La primera columna** es una casilla de 16 px con radio de 4 px (azul cuando está marcada). Tiene aire a la izquierda y no lleva línea a su derecha.
- **El nombre** va con su foto de perfil, o con las iniciales en un círculo gris si no hay foto, más un subrayado sutil y debajo un texto gris de 12.5 px.
- Los valores van alineados a la derecha. Las fechas son texto normal, sin burbuja.

### Fichas (tarjeta de registro)
Siguen el modelo de la tarjeta de cada persona en Nómina:
1. **Encabezado:** avatar de 36 px, nombre en peso 600, rol en gris y el estado a la derecha.
2. **Detalles:** filas de «rótulo gris con ícono · valor», con el rótulo en una columna fija de unos 104 px.
3. **Barra de avance** delgada, de 6 px.
4. **Pie:** botones estándar, separados por una línea.

Las secciones de la ficha se separan con líneas de 1 px.

### Formularios y hojas (`.fin-sheet`)
- La hoja es una tarjeta con radio de 12 px y sombra grande. El título va en 18 px y peso 600, con la descripción en gris; el pie lleva fondo `--subtle`.
- **En computador**, cada campo es una fila con el rótulo a la izquierda (columna de 150 px) y el control a la derecha.
- Los campos miden 32–36 px, con radio de 8 px, borde suave y sombra mínima. Al enfocarlos, el borde se pone azul y aparece un halo `--brand-soft`.
- Las opciones (categoría, cuánto pagó) son botones de 30 px con un punto de color. La opción elegida toma el fondo pastel de su color.

### Números de paso y servicios
Van en un cuadrito de 6 px de radio con **borde del color del servicio**, fondo pastel y número en peso 600 (01, 02, 03…).

### Barra lateral (`sidebar.js`)
- Mide 224 px, con fondo `#FBFBFC` y línea a la derecha.
- Arriba van el logo, el nombre y el botón para ocultarla. Luego está Inicio y la sección «Herramientas», que se puede plegar.
- **Íconos de línea grises, sin color.** El elemento activo es blanco con borde suave y sombra.
- Abajo quedan el interruptor claro/oscuro y el espacio de «Perfil y ajustes».
- En el celular es un cajón que se abre desde la barra superior.

### Íconos
Son de línea, de 15–18 px, con trazo de 1.5–1.6 y en color gris (`--ink-2` o `--ink-3`). Solo toman color dentro de un botón de color o de una etiqueta.

---

## 6. Movimiento
- Las transiciones duran 150–200 ms con `cubic-bezier(.2,.8,.2,1)`.
- Hover: solo cambia un poco el fondo o la sombra, sin saltos ni zoom.
- Las secciones entran con un fundido y un desplazamiento de 8 px, escalonado.
- Se respeta `prefers-reduced-motion`.

---

## 7. Celular
- Bajo 700 px todo pasa a una columna.
- Las tablas se convierten en tarjetas por fila.
- Finanzas usa una barra de pestañas inferior, con el ícono arriba y el texto abajo.
- Los campos llevan texto de 16 px para que iOS no haga zoom.
- Los botones de acción principales se reparten en columnas iguales.

---

## 8. Lista de revisión para algo nuevo
- [ ] ¿Usa los tokens de `diseno.css` y ningún color suelto?
- [ ] ¿Todos los botones miden 32 px y hay un solo botón principal azul por vista?
- [ ] ¿Las tarjetas tienen radio de 12 px, borde de 1 px y sombra mínima?
- [ ] ¿Los textos siguen el orden rótulo gris → título negro → descripción gris?
- [ ] ¿Los estados usan punto de color y las categorías una etiqueta pastel?
- [ ] ¿Las tablas llevan ícono en cada encabezado y filas de 40 px?
- [ ] ¿Ningún texto toca un borde, aunque sea en el celular?
- [ ] ¿Se ve bien en claro y en oscuro?
- [ ] ¿Los PDF siguen con su línea gráfica original?
