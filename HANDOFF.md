# Handoff — Chez moi

Ultimo aggiornamento: 2026-10-21

## Cos'è

PWA per iPhone, per uso personale di Fabio, per ritrovare la passione per la cucina gourmet. Quattro schede:
Sfida (una tecnica a settimana scelta tra 24 in `public/sfide.js`, filtrate per gli attrezzi spuntati in
Opzioni), Diario (foto, voto, note), Ricette (con video YouTube incorporato), Chef (ricetta proposta da Claude).

Stesso schema di radar-eventi e calice: Worker + Hono + D1 + R2, frontend vanilla in `public/`, Cloudflare
Access, deploy a comando da Actions.

## Stato

| Cosa | Stato |
|---|---|
| Frontend, design HIG, test logica | fatto |
| Worker (diario, ricette, foto, chef) e test Vitest | fatto, provato in locale con `wrangler dev` |
| Risorse Cloudflare, Access, primo deploy | fatto il 2026-10-21 (deploy da locale con wrangler) |
| Secret `ANTHROPIC_API_KEY` | **da fare con Fabio** (checklist sotto) |
| Prova su iPhone | da fare |

## Scelte

- Attrezzi e "cambia sfida" restano nel `localStorage` del telefono: sono preferenze, non dati.
- Lo Chef usa `claude-opus-5-5` con output JSON strutturato e il ripiego automatico (`fallbacks: "default"`) in caso di rifiuto; tetto di 20 richieste al giorno.
- Niente export/import: i dati sono su D1 (che ha Time Travel) e R2.
- Le temperature del sottovuoto in `sfide.js` sono valori classici, non verificati su una fonte.

## Checklist primo deploy

- [x] D1: `npx wrangler@4 d1 create chez-moi-db`, id in `wrangler.jsonc`.
- [x] R2: `npx wrangler@4 r2 bucket create chez-moi-foto`.
- [x] Access: applicazione self-hosted su `chezmoi.smartcores.org` con la policy riutilizzabile "Solo Fabio"; AUD in `wrangler.jsonc` (`ACCESS_AUD`).
- [x] Primo deploy, fatto da locale con wrangler; i successivi da Actions → Deploy → Run workflow.
- [x] Secret del Worker `ALLOWED_EMAIL`.
- [x] Secret di repository `CLOUDFLARE_API_TOKEN` (token "chez-moi"); workflow Deploy provato il 2026-10-21.
- [ ] Secret del Worker `ANTHROPIC_API_KEY`.
- [ ] iPhone: aggiungi a Home, sfida fatta con foto, ricetta con video, Chef, testo grande.
