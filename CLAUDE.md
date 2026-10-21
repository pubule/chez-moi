# Chez moi

Stato del progetto, decisioni e cose da fare: `HANDOFF.md`.

## Ponytail sempre attivo

In ogni sessione su questo repository lavora con la skill `ponytail` a livello **full** (`.claude/skills/ponytail/SKILL.md`): caricala all'inizio del lavoro sul codice, senza aspettare che venga chiesta. Le altre skill (`/ponytail-review`, `/ponytail-audit`, `/ponytail-debt`, `/ponytail-gain`, `/ponytail-help`) si usano quando servono. Livello diverso o spenta solo se Fabio lo chiede.

## Design

Ogni modifica all'interfaccia segue la skill `apple-design` (`.agents/skills/apple-design/SKILL.md`, Human Interface Guidelines). Contrasti calcolati e annotati in cima a `public/style.css`.

## Regole imparate da calice e radar-eventi

- `public/sw.js`: alzare `VERSION` a ogni modifica dei file dello shell; `fetch(e.request)` senza secondo argomento; `/api` mai in cache.
- Icone di Home in RGB pieno, angoli non arrotondati (iOS mette nero l'alpha e arrotonda da sé).
- Un `PUT` riceve sempre il modulo intero e sovrascrive tutti i campi.
- Ogni chiamata a un servizio a pagamento ha un tetto giornaliero in codice (`ai_usage`).
