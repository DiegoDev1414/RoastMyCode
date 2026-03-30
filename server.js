require('dotenv').config();
const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'allow' }));

const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
].filter(Boolean);

const MODEL = 'openai/gpt-oss-120b';
let keyIndex = 0;

function fixTruncatedJSON(str) {
  try {
    let fixed = str;
    const opens       = (fixed.match(/\[/g) || []).length;
    const closes      = (fixed.match(/\]/g) || []).length;
    const openBraces  = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;

    fixed = fixed.replace(/,\s*$/, '');
    fixed = fixed.replace(/,\s*\}/g, '}');
    fixed = fixed.replace(/,\s*\]/g, ']');

    for (let i = 0; i < opens - closes; i++) fixed += ']';
    for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';

    return JSON.parse(fixed);
  } catch {
    return null;
  }
}

function parseJSON(raw) {
  try {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        const fixed = fixTruncatedJSON(match[0]);
        if (fixed) return fixed;
      }
    }
    throw new Error('El modelo no devolvió JSON válido, intenta de nuevo');
  }
}

async function callGroq(prompt, retries = 3, maxTokens = 4000) {
  for (let i = 0; i < retries; i++) {
    try {
      const apiKey = GROQ_KEYS[keyIndex % GROQ_KEYS.length];
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: maxTokens })
      });
      if (!response.ok) {
        const err = await response.json();
        if (response.status === 429) {
          keyIndex++;
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        throw new Error(err.error?.message || `Groq error ${response.status}`);
      }
      keyIndex++;
      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// ── ROAST ──
app.post('/api/roast', async (req, res) => {
  const { code, lang, intensity = 'medio' } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  if (!GROQ_KEYS.length) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const langHint = lang && lang !== 'auto' ? `El lenguaje es ${lang}.` : '';
  const intensityGuide = {
    medio:       'Sé duro pero con algo de compasión. Como un tech lead que todavía cree en el dev.',
    brutal:      'Sin filtros. Destroza el código sin piedad pero con inteligencia técnica.',
    apocalipsis: 'Como si este código fuera el motivo por el que colapsó la civilización. Máximo drama técnico.',
  }[intensity] || '';

  const prompt = `Eres un desarrollador senior latinoamericano con 15 años de experiencia, conocido por tus code reviews despiadados y tu humor negro. Hablas como alguien de LATAM, no como un bot. ${langHint}

${intensityGuide}

Tu misión: hacer un ROAST técnico y específico del código. Lee línea por línea y ataca cosas REALES: nombres de variables horribles, lógica retorcida, código duplicado, falta de manejo de errores, malas prácticas del lenguaje, complejidad innecesaria.

ESTILO:
- Español latinoamericano coloquial (mae, wey, causa, man, broder)
- Sin emojis exagerados. Máximo 2-3 en todo el texto
- Analogías ingeniosas y específicas
- Menciona problemas técnicos REALES con nombres concretos
- Termina con UN consejo genuinamente útil, dado de forma sarcástica

IMPORTANTE: Responde ÚNICAMENTE con el objeto JSON. Sin backticks, sin texto extra.

{
  "shame_score": <1-10>,
  "pain_score": <1-10>,
  "hope_score": <1-10>,
  "badges": ["badge1", "badge2", "badge3", "badge4"],
  "roast": "<200-300 palabras, específico al código>"
}

CÓDIGO:
\`\`\`
${code}
\`\`\``;

  try {
    const raw = await callGroq(prompt);
    res.json(parseJSON(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── FIX ──
app.post('/api/fix', async (req, res) => {
  const { code, lang } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  if (!GROQ_KEYS.length) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const langHint = lang && lang !== 'auto' ? `El lenguaje es ${lang}.` : '';

  const prompt = `Eres un desarrollador senior latinoamericano. ${langHint}

Analiza este código, encuentra los bugs y malas prácticas más importantes, y devuelve una versión corregida.

IMPORTANTE: Responde ÚNICAMENTE con este JSON. Sin backticks, sin texto extra. Máximo 3 cambios, sé conciso.

{
  "fixed_code": "<el código corregido completo>",
  "changes": ["cambio 1", "cambio 2", "cambio 3"],
  "severity": "<'leve' | 'moderado' | 'grave' | 'catastrófico'>"
}

CÓDIGO:
\`\`\`
${code}
\`\`\``;

  try {
    const raw = await callGroq(prompt, 3, 4000);
    res.json(parseJSON(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── EXPLAIN ──
app.post('/api/explain', async (req, res) => {
  const { code, lang } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  if (!GROQ_KEYS.length) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const langHint = lang && lang !== 'auto' ? `El lenguaje es ${lang}.` : '';

  const prompt = `Eres un desarrollador latinoamericano que explica código de forma simple y divertida. ${langHint}

Explica qué hace este código como si el que escucha tuviera 5 años, usando analogías del mundo real, ejemplos cotidianos y humor. Habla en español latinoamericano coloquial.

IMPORTANTE: Responde ÚNICAMENTE con este JSON. Sin backticks, sin texto extra.

{
  "summary": "<una frase corta de qué hace el código>",
  "explanation": "<explicación completa en 150-250 palabras, como para un niño de 5 años pero con humor>",
  "analogy": "<una analogía graciosa del mundo real que describe el código>",
  "complexity": "<'fácil' | 'medio' | 'complejo' | 'alienígena'>"
}

CÓDIGO:
\`\`\`
${code}
\`\`\``;

  try {
    const raw = await callGroq(prompt);
    res.json(parseJSON(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── RENAME ──
app.post('/api/rename', async (req, res) => {
  const { code, lang } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  if (!GROQ_KEYS.length) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const langHint = lang && lang !== 'auto' ? `El lenguaje es ${lang}.` : '';

  const prompt = `Eres un desarrollador senior latinoamericano experto en clean code. ${langHint}

Analiza este código y encuentra todas las variables, funciones y parámetros con nombres horribles o poco descriptivos. Para cada uno sugiere un nombre mejor siguiendo buenas prácticas.

IMPORTANTE: Responde ÚNICAMENTE con este JSON. Sin backticks, sin texto extra.

{
  "fixed_code": "<el código completo con todos los nombres mejorados>",
  "renames": [
    { "old": "nombre viejo", "new": "nombre nuevo", "reason": "por qué es mejor" }
  ],
  "verdict": "<comentario sarcástico corto sobre los nombres originales>"
}

CÓDIGO:
\`\`\`
${code}
\`\`\``;

  try {
    const raw = await callGroq(prompt, 3, 4000);
    res.json(parseJSON(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TWEET ──
app.post('/api/tweet', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  if (!GROQ_KEYS.length) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const prompt = `Eres un dev latinoamericano frustrado. Genera un tweet perfecto (máx 240 caracteres) quejándote de este código. Usa humor, jerga dev, emojis con moderación. Habla en español LATAM coloquial.

IMPORTANTE: Responde ÚNICAMENTE con este JSON. Sin backticks, sin texto extra.
{ "tweet": "<el tweet completo, máx 240 chars>" }

CÓDIGO:
\`\`\`
${code}
\`\`\``;

  try {
    const raw = await callGroq(prompt);
    res.json(parseJSON(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── MEME ──
app.post('/api/meme', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  if (!GROQ_KEYS.length) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const prompt = `Eres un experto en cultura de internet y memes de programación. Analiza este código y determina qué meme lo representa perfectamente.

IMPORTANTE: Responde ÚNICAMENTE con este JSON. Sin backticks, sin texto extra.
{
  "meme_name": "<nombre del meme (ej: This is fine, Disaster Girl, Drake, etc.)>",
  "top_text": "<texto de arriba del meme, en mayúsculas, relacionado al código>",
  "bottom_text": "<texto de abajo del meme, en mayúsculas, el remate>",
  "description": "<descripción en 2-3 frases de por qué este meme representa perfectamente el código, en español LATAM>"
}

CÓDIGO:
\`\`\`
${code}
\`\`\``;

  try {
    const raw = await callGroq(prompt);
    res.json(parseJSON(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TIME TRAVEL ──
app.post('/api/timetravel', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  if (!GROQ_KEYS.length) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const prompt = `Eres un historiador del software. Reescribe este código como si hubiera sido escrito en tres épocas distintas, manteniendo la misma funcionalidad pero con el estilo típico de cada era.

IMPORTANTE: Responde con este JSON donde los campos de código son placeholders, y el código real va DESPUÉS separado por marcadores:

{
  "era_1995": "CODE_1995",
  "comment_1995": "<frase graciosa sobre el estilo de 1995 en español LATAM>",
  "era_2010": "CODE_2010",
  "comment_2010": "<frase graciosa sobre el estilo de 2010 en español LATAM>",
  "era_2030": "CODE_2030",
  "comment_2030": "<frase graciosa sobre el futuro en español LATAM>"
}

===CODE_1995===
<código reescrito al estilo 1995: variables de una letra, goto si aplica, comentarios en inglés formal, estilo C/Basic/early Java>
===CODE_2010===
<código reescrito al estilo 2010: jQuery si es JS, patrones enterprise, XML, mucho boilerplate, design patterns por doquier>
===CODE_2030===
<código reescrito al estilo 2030: un comentario diciendo 'le pedí a la IA que lo hiciera', código hiperoptimizado o absurdamente simple, con decorators cuánticos inventados>
===END===

CÓDIGO:
\`\`\`
${code}
\`\`\``;

  try {
    const raw = await callGroq(prompt, 3, 4000);
    const code1995 = raw.match(/===CODE_1995===([\s\S]*?)===CODE_2010===/)?.[1]?.trim();
    const code2010 = raw.match(/===CODE_2010===([\s\S]*?)===CODE_2030===/)?.[1]?.trim();
    const code2030 = raw.match(/===CODE_2030===([\s\S]*?)===END===/)?.[1]?.trim();
    const json = parseJSON(raw);
    if (code1995) json.era_1995 = code1995;
    if (code2010) json.era_2010 = code2010;
    if (code2030) json.era_2030 = code2030;
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GIT BLAME ──
app.post('/api/gitblame', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  if (!GROQ_KEYS.length) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const prompt = `Eres un arqueólogo de código. Inventa un historial de git commits ridículo y divertido para este código. Los commits deben revelar la historia trágica de cómo el código llegó a ser tan desastroso.

IMPORTANTE: Responde ÚNICAMENTE con este JSON. Sin backticks, sin texto extra.
{
  "commits": [
    { "hash": "<7 chars hex>", "author": "<nombre inventado>", "date": "<fecha relativa ej: hace 3 años>", "message": "<mensaje de commit ridículo en español>" },
    { "hash": "<7 chars hex>", "author": "<nombre inventado>", "date": "<fecha relativa>", "message": "<mensaje de commit ridículo>" },
    { "hash": "<7 chars hex>", "author": "<nombre inventado>", "date": "<fecha relativa>", "message": "<mensaje de commit ridículo>" },
    { "hash": "<7 chars hex>", "author": "<nombre inventado>", "date": "<fecha relativa>", "message": "<mensaje de commit ridículo>" },
    { "hash": "<7 chars hex>", "author": "<nombre inventado>", "date": "<fecha relativa>", "message": "<mensaje de commit ridículo>" },
    { "hash": "<7 chars hex>", "author": "<nombre inventado>", "date": "<fecha relativa>", "message": "<mensaje de commit ridículo>" },
    { "hash": "<7 chars hex>", "author": "<nombre inventado>", "date": "<hace 2 días>", "message": "<mensaje de commit ridículo, el más reciente y desesperado>" }
  ]
}

CÓDIGO:
\`\`\`
${code}
\`\`\``;

  try {
    const raw = await callGroq(prompt);
    res.json(parseJSON(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── EXCUSES ──
app.post('/api/excuses', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  if (!GROQ_KEYS.length) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const prompt = `Eres un dev latinoamericano experto en justificar código horrible ante su tech lead. Genera 10 excusas creativas, específicas al código dado, que mezclen tecnicismos reales con excusas absurdas. En español LATAM coloquial.

IMPORTANTE: Responde ÚNICAMENTE con este JSON. Sin backticks, sin texto extra.
{
  "excuses": [
    "<excusa 1>",
    "<excusa 2>",
    "<excusa 3>",
    "<excusa 4>",
    "<excusa 5>",
    "<excusa 6>",
    "<excusa 7>",
    "<excusa 8>",
    "<excusa 9>",
    "<excusa 10>"
  ]
}

CÓDIGO:
\`\`\`
${code}
\`\`\``;

  try {
    const raw = await callGroq(prompt);
    res.json(parseJSON(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CV ──
app.post('/api/cv', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  if (!GROQ_KEYS.length) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const prompt = `Eres un reclutador de RRHH que evalúa código como si fuera un candidato buscando empleo. Genera el CV laboral del código analizado, como si el código mismo fuera a mandar su hoja de vida a una empresa tech. Sé creativo, específico al código real, y muy gracioso. Habla en español LATAM coloquial.

IMPORTANTE: Responde ÚNICAMENTE con este JSON. Sin backticks, sin texto extra.
{
  "nombre": "<nombre dramático e inventado para el código>",
  "titulo": "<título profesional absurdo pero relacionado al código>",
  "resumen": "<resumen profesional de 2-3 frases como si el código se vendiera a sí mismo>",
  "experiencia": [
    { "empresa": "<empresa inventada graciosa>", "cargo": "<cargo relacionado al código>", "logro": "<logro ridículo pero específico al código>" },
    { "empresa": "<empresa inventada graciosa>", "cargo": "<cargo relacionado al código>", "logro": "<logro ridículo pero específico al código>" },
    { "empresa": "<empresa inventada graciosa>", "cargo": "<cargo relacionado al código>", "logro": "<logro ridículo pero específico al código>" }
  ],
  "habilidades": ["<habilidad técnica real>", "<habilidad absurda>", "<habilidad técnica real>", "<habilidad absurda>", "<habilidad técnica real>"],
  "red_flags": ["<red flag específica al código>", "<red flag específica>", "<red flag específica>"],
  "pretension_salarial": "<salario absurdo con justificación>",
  "referencias": "<comentario gracioso sobre por qué no hay referencias>"
}

CÓDIGO:
\`\`\`
${code}
\`\`\``;

  try {
    const raw = await callGroq(prompt);
    res.json(parseJSON(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── HORÓSCOPO ──
app.post('/api/horoscopo', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  if (!GROQ_KEYS.length) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  const prompt = `Eres una vidente y astróloga especializada en leer el futuro de proyectos de software a través del código. Analiza este código como si fuera una carta astral y predice el destino del proyecto con humor dramático y referencias astrológicas reales mezcladas con términos técnicos. Habla en español LATAM coloquial.

IMPORTANTE: Responde ÚNICAMENTE con este JSON. Sin backticks, sin texto extra.
{
  "signo": "<signo zodiacal que representa este código y por qué>",
  "planeta_regente": "<planeta que rige este código con explicación técnico-astrológica>",
  "prediccion_corto_plazo": "<qué le pasará al proyecto en los próximos 30 días>",
  "prediccion_largo_plazo": "<destino final del proyecto en 1 año>",
  "mercurio_retrogrado": "<cómo afecta mercurio retrógrado a este código>",
  "carta_astral": "<lectura completa de 3-4 frases de la carta astral del código>",
  "consejo_cosmico": "<consejo que darían los astros al dev>",
  "compatibilidad": "<con qué tecnologías es compatible astrológicamente>"
}

CÓDIGO:
\`\`\`
${code}
\`\`\``;

  try {
    const raw = await callGroq(prompt);
    res.json(parseJSON(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── HTTP → HTTPS redirect ──
http.createServer((req, res) => {
  res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
  res.end();
}).listen(80, () => console.log('🔀 HTTP → HTTPS redirect activo en puerto 80'));

// ── HTTPS ──
const sslOptions = {
  key:  fs.readFileSync('/etc/letsencrypt/live/roastmycode.duckdns.org/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/roastmycode.duckdns.org/fullchain.pem')
};

https.createServer(sslOptions, app).listen(443, () => console.log('🔥 RoastMyCode corriendo en https://roastmycode.duckdns.org'));
