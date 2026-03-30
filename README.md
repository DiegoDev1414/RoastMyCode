# roastmycode

![Node](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square)
![Groq](https://img.shields.io/badge/Groq-API-orange?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Deploy](https://img.shields.io/badge/Deploy-CubePath-green?style=flat-square)

Tu código merece sufrir. 11 herramientas de IA que analizan, destruyen y humillan tu código en español latinoamericano, sin filtros y sin piedad.

**Demo:** [https://roastmycode.duckdns.org](https://roastmycode.duckdns.org)

---

## Herramientas

| # | Nombre | Descripción |
|---|--------|-------------|
| 01 | roast | Destruye tu código con humor brutal. Calcula vergüenza, dolor y esperanza /10 |
| 02 | fix | Encuentra bugs y malas prácticas, devuelve el código corregido |
| 03 | explain | Explica tu código como si tuvieras 5 años, con analogías del mundo real |
| 04 | rename | Sugiere nombres decentes para variables horribles |
| 05 | tweet | Genera el tweet perfecto para quejarte del código (máx 240 chars) |
| 06 | meme | Encuentra el meme exacto que representa tu código |
| 07 | time travel | Reescribe tu código al estilo 1995, 2010 y 2030 |
| 08 | git blame | Inventa un historial de commits ridículo y trágico |
| 09 | excuses | Genera 10 excusas para justificar tu código ante el tech lead |
| 10 | cv | Genera el currículum laboral de tu código buscando trabajo |
| 11 | horóscopo | Los astros revelan el destino cósmico de tu proyecto |

---

## Capturas

![Home](https://raw.githubusercontent.com/DiegoDev1414/RoastMyCode/main/screenshots/home.png)

![Roast](https://raw.githubusercontent.com/DiegoDev1414/RoastMyCode/main/screenshots/roast.png)

![CV](https://raw.githubusercontent.com/DiegoDev1414/RoastMyCode/main/screenshots/cv.png)

---

## Stack

- **Backend:** Node.js + Express
- **IA:** Groq API — modelo `openai/gpt-oss-120b`
- **Frontend:** HTML + CSS + JavaScript vanilla
- **Deploy:** CubePath con HTTPS nativo via Let's Encrypt

---

## CubePath

El proyecto corre en un servidor CubePath con Node.js directo en los puertos 80 y 443. El servidor maneja el redirect HTTP → HTTPS y el certificado SSL sin nginx ni proxies adicionales, lo que CubePath hace posible al dar acceso root completo al servidor.

---

## Instalación local

```bash
git clone https://github.com/DiegoDev1414/RoastMyCode
cd RoastMyCode
npm install
```

Crea un archivo `.env` en la raíz:

```
GROQ_API_KEY=tu_api_key_aqui
```

Inicia el servidor:

```bash
node server.js
```

---

## Estructura

```
RoastMyCode/
├── server.js        # Backend con todos los endpoints de IA
├── public/
│   └── index.html   # Frontend completo
├── .env             # Variables de entorno (no incluido en el repo)
└── package.json
```

---

## API

Todos los endpoints reciben `POST` con `Content-Type: application/json`.

| Endpoint | Body | Descripción |
|----------|------|-------------|
| `/api/roast` | `{ code, lang, intensity }` | Roast del código |
| `/api/fix` | `{ code, lang }` | Fix de bugs |
| `/api/explain` | `{ code, lang }` | Explicación simple |
| `/api/rename` | `{ code, lang }` | Renombrado de variables |
| `/api/tweet` | `{ code }` | Tweet generado por IA |
| `/api/meme` | `{ code }` | Identificador de meme |
| `/api/timetravel` | `{ code }` | Código reescrito en 3 eras |
| `/api/gitblame` | `{ code }` | Historial de commits inventado |
| `/api/excuses` | `{ code }` | Excusas para el tech lead |
| `/api/cv` | `{ code }` | CV laboral del código |
| `/api/horoscopo` | `{ code }` | Horóscopo del proyecto |

---

## Licencia

MIT © 2026 [DiegoDev1414](https://github.com/DiegoDev1414)
