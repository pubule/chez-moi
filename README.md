# Chez moi

PWA per iPhone, per uso personale, che deve far tornare la voglia di cucinare: una sfida di tecnica a settimana, il diario dei piatti con foto, un ricettario e uno Chef (Claude) che propone ricette gourmet da quello che c'è in frigo.

## Architettura

- Un solo Cloudflare Worker (Hono, TypeScript) serve API e frontend statico (`public/`, JS vanilla, nessuna build).
- D1 `chez-moi-db` per diario e ricette (migrazioni in `worker/migrations/`), R2 `chez-moi-foto` per le foto.
- Chef: `POST /api/chef` chiama l'API Anthropic con la chiave nel secret `ANTHROPIC_API_KEY`, al massimo 20 ricette al giorno (`LIMITE_GIORNO`).
- Cloudflare Access (team `smartcores`) protegge `chezmoi.smartcores.org`; il Worker verifica il JWT e la mail in `ALLOWED_EMAIL`.

## Sviluppo locale

```
cd worker && npm ci && npx vitest run
node --test test/*.test.mjs        # logica del frontend, dalla root
```

App completa in locale, dalla root:

```
W=worker/node_modules/wrangler/bin/wrangler.js
node $W d1 migrations apply chez-moi-db --local --persist-to .wrangler/state -c wrangler.jsonc
node $W dev -c wrangler.jsonc --persist-to .wrangler/state --var ALLOWED_EMAIL:test@test.local --var DEV_EMAIL:test@test.local
```

## Deploy

**Da GitHub:** Actions → Deploy → Run workflow. Esegue test, migrazioni D1 di produzione e deploy
del Worker. Richiede il secret di repository `CLOUDFLARE_API_TOKEN` (modello "Edit Cloudflare
Workers" più il permesso D1: Edit). Ogni push lancia solo i test (workflow CI).

### Secrets del Worker

Impostati con `npx wrangler@4 secret put <NOME>`:

- `ALLOWED_EMAIL`: mail ammesse, separate da virgola (vanno messe anche nella policy di Access).
- `ANTHROPIC_API_KEY`: chiave da console.anthropic.com.
