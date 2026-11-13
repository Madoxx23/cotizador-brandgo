// Vercel Function: recibe el texto de un guion y devuelve su estructura de rodaje (JSON)
// usando Claude con salida estructurada. La clave vive en la variable de entorno
// ANTHROPIC_API_KEY de Vercel; nunca llega al navegador.
import Anthropic from '@anthropic-ai/sdk';

const MAX_CHARS = 30000; // tope del texto de entrada, para que nadie gaste la clave con textos enormes
const ALLOWED_HOSTS = ['cotizador-brandgo.vercel.app', 'localhost', '127.0.0.1'];

const ITEM = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'tipo', 'numero', 'titulo', 'plano', 'locacion', 'cita', 'texto', 'nota', 'en_video'],
  properties: {
    id: { type: 'string', description: 'Identificador corto y único: v1, v2... para momentos del video; x1, x2... para tomas extra por locación.' },
    tipo: { type: 'string', enum: ['entrevista', 'apoyo', 'montaje', 'cierre'] },
    numero: { type: 'string', description: 'Entrevista: "E". Apoyo: "01", "02"... en orden de aparición en el video. Montaje: "B". Cierre: "F". Toma extra sin número: "—".' },
    titulo: { type: 'string', description: 'Nombre corto. En entrevistas, el nombre de quien habla.' },
    plano: { type: 'string', description: 'Plano y movimiento de cámara, ej. "Medio · De lado · Mira al entrevistador". Vacío si el guion no lo dice ni se deduce.' },
    locacion: { type: 'string', description: 'Dónde se graba. Vacío si no se sabe.' },
    cita: { type: 'string', description: 'Solo entrevistas: la frase literal que dice la persona, sin comillas. Vacío en otros tipos.' },
    texto: { type: 'string', description: 'Qué pasa en la toma, en una o dos frases. Vacío en entrevistas si la cita lo dice todo.' },
    nota: { type: 'string', description: 'Advertencias de producción del guion (pendientes, revisar con el cliente). Vacío si no hay.' },
    en_video: { type: 'boolean', description: 'true si es un momento del corte final en su orden; false si es una toma extra por locación (partes de un montaje).' }
  }
};

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['titulo', 'cliente', 'lema', 'lema_resaltado', 'protagonistas', 'locaciones', 'reglas', 'momentos', 'bloques'],
  properties: {
    titulo: { type: 'string', description: 'Título del guion o de la pieza.' },
    cliente: { type: 'string', description: 'Marca o cliente, si aparece.' },
    lema: { type: 'string', description: 'Frase o concepto de cierre de la pieza, si existe. Vacío si no.' },
    lema_resaltado: { type: 'string', description: 'Una palabra o expresión del lema para resaltar. Vacío si no hay lema.' },
    protagonistas: { type: 'array', items: { type: 'string' } },
    locaciones: { type: 'array', items: { type: 'string' } },
    reglas: {
      type: 'array',
      description: 'Indicaciones generales de rodaje del guion (planos de entrevista, vestuario, qué evitar).',
      items: {
        type: 'object', additionalProperties: false, required: ['titulo', 'texto', 'evitar'],
        properties: { titulo: { type: 'string' }, texto: { type: 'string' }, evitar: { type: 'boolean' } }
      }
    },
    momentos: { type: 'array', description: 'Todos los momentos: primero los del video en su orden (en_video true), luego las tomas extra (en_video false).', items: ITEM },
    bloques: {
      type: 'array',
      description: 'Plan de rodaje agrupado por ubicación, en el orden en que conviene grabar. Cada id de momentos aparece exactamente una vez.',
      items: {
        type: 'object', additionalProperties: false, required: ['nombre', 'descripcion', 'ids'],
        properties: { nombre: { type: 'string' }, descripcion: { type: 'string' }, ids: { type: 'array', items: { type: 'string' } } }
      }
    }
  }
};

const SYSTEM = `Eres el asistente de producción de Brandgo, una agencia creativa colombiana. Recibes un guion audiovisual escrito libremente (en español) y lo conviertes en un guion técnico para controlar el rodaje con un checklist.

Cómo clasificar cada momento:
- "entrevista": alguien habla a cámara o al entrevistador. La frase va literal en "cita".
- "apoyo": toma de acción sin diálogo (B-roll). Se numeran 01, 02, 03… en el orden en que aparecen en el video.
- "montaje": secuencia armada con varias tomas cortas (por ejemplo, las tres protagonistas estirando, cada una en su locación). Número "B".
- "cierre": el plano final con voz en off, logos o lema. Número "F".

Cuando un montaje combina tomas grabadas en locaciones distintas, agrega además una toma extra (en_video false, número "—" o "B") por cada locación, para que en el plan de rodaje quede en cada lugar.

Plan de rodaje ("bloques"): agrupa todo por ubicación, en un orden práctico: primero las entrevistas (si se graban juntas en un mismo lugar, agrúpalas por persona), luego cada locación con sus tomas de apoyo. Cada id de "momentos" debe aparecer en exactamente un bloque. El nombre del bloque lleva número y lugar, por ejemplo "4 · La Gaitana · tomas de apoyo"; la descripción resume en una frase qué se graba ahí.

Reglas: extrae las indicaciones generales que dé el guion (tipo de plano para entrevistas, hacia dónde mira la persona, vestuario, qué evitar). Marca "evitar" true en las que son prohibiciones. Si el guion no da ninguna, devuelve una lista vacía.

No inventes contenido: usa las palabras del guion. Si un dato no está (plano, locación), deja el campo vacío. Escribe en español, frases cortas, sin emojis.`;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'Usa POST.' }); return; }

  // Solo se acepta desde la web de Brandgo (freno básico contra uso desde otros sitios).
  // Con Referrer-Policy no-referrer, el navegador manda Origin "null" en peticiones de la misma web;
  // por eso también se acepta Sec-Fetch-Site: same-origin, que el navegador pone y una página ajena no puede falsificar.
  const origin = req.headers.origin || '';
  let host = '';
  try { host = new URL(origin).hostname; } catch (e) { host = ''; }
  const sameOrigin = req.headers['sec-fetch-site'] === 'same-origin';
  if (!sameOrigin && !ALLOWED_HOSTS.includes(host)) { res.status(403).json({ error: 'Origen no permitido.' }); return; }

  if (!process.env.ANTHROPIC_API_KEY) { res.status(503).json({ error: 'Falta configurar la clave de la IA en Vercel (ANTHROPIC_API_KEY).' }); return; }

  const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
  const texto = String(body.texto || '').trim();
  const titulo = String(body.titulo || '').trim().slice(0, 160);
  const cliente = String(body.cliente || '').trim().slice(0, 120);
  if (texto.length < 40) { res.status(400).json({ error: 'El guion es muy corto. Pega el texto completo.' }); return; }
  if (texto.length > MAX_CHARS) { res.status(413).json({ error: `El guion supera ${MAX_CHARS.toLocaleString('es-CO')} caracteres. Divídelo en partes.` }); return; }

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Cuenta / cliente: ${cliente || 'sin dato'}\nTítulo sugerido: ${titulo || 'sin dato'}\n\n<guion>\n${texto}\n</guion>`
      }]
    });

    if (response.stop_reason === 'refusal') { res.status(422).json({ error: 'La IA no pudo procesar este guion. Revisa el texto e intenta de nuevo.' }); return; }
    if (response.stop_reason === 'max_tokens') { res.status(422).json({ error: 'El guion es demasiado largo para procesarlo de una vez. Divídelo en partes.' }); return; }

    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const estructura = safeJson(text);
    if (!estructura || !Array.isArray(estructura.momentos)) { res.status(502).json({ error: 'La respuesta de la IA llegó incompleta. Intenta de nuevo.' }); return; }
    res.status(200).json({ estructura: normalizar(estructura) });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) { res.status(429).json({ error: 'Hay muchas solicitudes en este momento. Espera un minuto e intenta de nuevo.' }); return; }
    if (error instanceof Anthropic.AuthenticationError) { res.status(503).json({ error: 'La clave de la IA no es válida. Revísala en Vercel.' }); return; }
    if (error instanceof Anthropic.APIError) { console.error('Claude API', error.status, error.message); res.status(502).json({ error: 'La IA no respondió. Intenta de nuevo en un momento.' }); return; }
    console.error(error);
    res.status(500).json({ error: 'No se pudo procesar el guion.' });
  }
}

function safeJson(s) { try { return JSON.parse(s); } catch (e) { return null; } }

// Garantiza ids únicos y que cada momento esté en algún bloque
function normalizar(e) {
  const seen = new Set();
  e.momentos = e.momentos.filter(m => m && m.id && !seen.has(m.id) && seen.add(m.id));
  const ids = new Set(e.momentos.map(m => m.id));
  e.bloques = (e.bloques || []).map(b => ({ ...b, ids: (b.ids || []).filter(id => ids.has(id)) })).filter(b => b.ids.length);
  const usados = new Set(e.bloques.flatMap(b => b.ids));
  const sueltos = e.momentos.filter(m => !usados.has(m.id)).map(m => m.id);
  if (sueltos.length) e.bloques.push({ nombre: `${e.bloques.length + 1} · Otras tomas`, descripcion: 'Momentos sin ubicación asignada.', ids: sueltos });
  return e;
}
