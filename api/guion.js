// Vercel Function: «Etiquetar con Claude».
// Recibe un guion escrito libremente y lo devuelve con las etiquetas que entiende el módulo de guiones
// (UBICACIÓN:, ENTREVISTA:, TOMA:…). El checklist se sigue armando en el navegador.
// Seguridad:
//  - La clave vive en la variable de entorno ANTHROPIC_API_KEY de Vercel; nunca llega al navegador.
//  - Solo personas con sesión en Supabase y autorizadas (tabla guion_editores o miembros) pueden usarla:
//    la función pregunta a Supabase con el token de la persona, así que no hace falta ninguna clave secreta.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-5-5';
const MAX_CHARS = 30000; // tope del texto de entrada
const ALLOWED_HOSTS = ['cotizador-brandgo.vercel.app', 'localhost', '127.0.0.1'];
// Datos públicos del proyecto (los mismos de finanzas-config.js)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://diwpxgrouvjyadtqjhpq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_NMU6EiiUY_N4yimPNM8I1g_eVCq_qb6';

const SYSTEM = `Eres el asistente de producción de Brandgo, una agencia creativa colombiana. Recibes un guion audiovisual escrito libremente en español y lo reescribes con etiquetas para que el equipo lo use como checklist de rodaje.

Formato de salida: solo el guion etiquetado, en texto plano. Cada línea empieza con UNA de estas etiquetas, en mayúsculas y seguida de dos puntos:

Datos del guion (van al inicio, solo si el guion los trae):
TÍTULO: título de la pieza
LEMA: frase de concepto o de cierre; encierra entre *asteriscos* la palabra más importante
PROTAGONISTAS: nombres separados por coma
REGLA: Título corto — indicación general de rodaje (tipo de plano de las entrevistas, hacia dónde mira la persona, vestuario)
EVITAR: Título corto — algo que no debe pasar en el rodaje

Plan de rodaje:
UBICACIÓN: lugar donde se graba. Todo lo que sigue queda en ese lugar hasta la siguiente UBICACIÓN.
ENTREVISTA: nombre de quien habla a cámara o al entrevistador
FRASE: lo que dice esa persona, literal y sin comillas. Una línea FRASE por cada frase o bloque de respuesta.
TOMA: toma de apoyo sin diálogo (acción), con un título corto
MONTAJE: secuencia armada con varias tomas cortas
CIERRE: plano final con voz en off, logo o lema
EXTRA: toma de respaldo que no va en el orden del video (por ejemplo, la parte de un montaje que se graba en otro lugar)

Detalle (justo debajo de la ENTREVISTA, TOMA, MONTAJE, CIERRE o EXTRA a la que pertenece):
PLANO: plano y movimiento de cámara
NOTA: advertencia de producción (utilería, luz, permisos, pendientes con el cliente)
Una línea sin etiqueta debajo de una toma es la descripción de lo que pasa; úsala para explicar la acción en una o dos frases.

Reglas:
- Respeta el orden en que las cosas aparecen en el video. Si una entrevista y sus frases se graban en un solo lugar, ponlas juntas debajo de su UBICACIÓN.
- Cada ENTREVISTA, TOMA, MONTAJE, CIERRE y EXTRA debe tener una UBICACIÓN antes. Si el guion no dice el lugar, usa «UBICACIÓN: Por definir».
- Cuando un montaje combina tomas grabadas en lugares distintos, escribe el MONTAJE donde va en el video y agrega una línea EXTRA en cada uno de los otros lugares.
- No inventes contenido. Usa las palabras del guion. Si un dato no está (plano, nota), omite esa línea.
- Deja una línea en blanco entre bloques para que se lea fácil.
- No agregues explicaciones, títulos de sección, viñetas, markdown ni emojis. Solo las líneas del guion.`;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'Usa POST.' }); return; }

  // Solo desde la web de Brandgo. Con Referrer-Policy no-referrer el navegador manda Origin "null";
  // por eso también se acepta Sec-Fetch-Site: same-origin, que una página ajena no puede falsificar.
  let host = '';
  try { host = new URL(req.headers.origin || '').hostname; } catch (e) { host = ''; }
  if (req.headers['sec-fetch-site'] !== 'same-origin' && !ALLOWED_HOSTS.includes(host)) { res.status(403).json({ error: 'Origen no permitido.' }); return; }

  // 1. ¿Quién pide? Se valida el token con Supabase.
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) { res.status(401).json({ error: 'Inicia sesión para usar Claude.' }); return; }
  const permiso = await rpc('puede_usar_ia', token);
  if (permiso.status === 401) { res.status(401).json({ error: 'Tu sesión venció. Vuelve a iniciar sesión.' }); return; }
  if (!permiso.ok) { res.status(503).json({ error: 'Falta activar Claude en la base de datos: corre supabase/guiones-ia.sql.' }); return; }
  if (permiso.data !== true) { res.status(403).json({ error: 'Tu cuenta no tiene permiso para usar Claude. Pídele acceso a Mauro.' }); return; }

  if (!process.env.ANTHROPIC_API_KEY) { res.status(503).json({ error: 'Falta configurar la clave de Claude en Vercel (ANTHROPIC_API_KEY).' }); return; }

  // 2. El texto
  const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
  const texto = String((body && body.texto) || '').trim();
  const titulo = String((body && body.titulo) || '').trim().slice(0, 160);
  const cliente = String((body && body.cliente) || '').trim().slice(0, 120);
  if (texto.length < 40) { res.status(400).json({ error: 'El guion es muy corto. Pega el texto completo.' }); return; }
  if (texto.length > MAX_CHARS) { res.status(413).json({ error: `El guion supera ${MAX_CHARS.toLocaleString('es-CO')} caracteres. Divídelo en partes.` }); return; }

  // 3. Claude
  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Cliente: ${cliente || 'sin dato'}\nTítulo: ${titulo || 'sin dato'}\n\n<guion>\n${texto}\n</guion>\n\nDevuelve el guion etiquetado.`
      }]
    });

    if (response.stop_reason === 'refusal') { res.status(422).json({ error: 'Claude no pudo procesar este guion. Revisa el texto e intenta de nuevo.' }); return; }
    if (response.stop_reason === 'max_tokens') { res.status(422).json({ error: 'El guion es demasiado largo para etiquetarlo de una vez. Divídelo en partes.' }); return; }

    let salida = response.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
    salida = salida.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
    if (!/^\s*(UBICACI[ÓO]N|ENTREVISTA|TOMA|MONTAJE|CIERRE|EXTRA)\s*:/mi.test(salida)) { res.status(502).json({ error: 'La respuesta de Claude llegó incompleta. Intenta de nuevo.' }); return; }

    // Registro de uso para saber cuánto cuesta cada guion (si falla, no importa)
    const u = response.usage || {};
    await rpc('registrar_uso_ia', token, { caracteres: texto.length, tokens_entrada: u.input_tokens || 0, tokens_salida: u.output_tokens || 0, modelo: MODEL }).catch(() => {});

    res.status(200).json({ texto: salida });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) { res.status(429).json({ error: 'Hay muchas solicitudes en este momento. Espera un minuto e intenta de nuevo.' }); return; }
    if (error instanceof Anthropic.AuthenticationError) { res.status(503).json({ error: 'La clave de Claude no es válida. Revísala en Vercel.' }); return; }
    if (error instanceof Anthropic.APIError && /credit|billing|spend|limit/i.test(error.message || '')) { console.error('Claude API', error.status, error.message); res.status(503).json({ error: 'La cuenta de Anthropic no tiene créditos o llegó a su límite de gasto.' }); return; }
    if (error instanceof Anthropic.APIError) { console.error('Claude API', error.status, error.message); res.status(502).json({ error: 'Claude no respondió. Intenta de nuevo en un momento.' }); return; }
    console.error(error);
    res.status(500).json({ error: 'No se pudo procesar el guion.' });
  }
}

async function rpc(fn, token, args) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args || {})
    });
    const data = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, data };
  } catch (e) { return { ok: false, status: 0, data: null }; }
}

function safeJson(s) { try { return JSON.parse(s); } catch (e) { return null; } }
