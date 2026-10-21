import { SFIDE, ATTREZZI } from './sfide.js';
import { settimana, sfidaDellaSettimana, youtubeId } from './logic.js';

// ---------- dati ----------

const dbP = new Promise((ok, ko) => {
  const r = indexedDB.open('chez-moi', 1);
  r.onupgradeneeded = () => {
    r.result.createObjectStore('diario', { keyPath: 'id' });
    r.result.createObjectStore('ricette', { keyPath: 'id' });
  };
  r.onsuccess = () => ok(r.result);
  r.onerror = () => ko(r.error);
});

async function tx(store, mode, fn) {
  const db = await dbP;
  return new Promise((ok, ko) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => ok(req.result);
    t.onerror = () => ko(t.error);
  });
}
const tutti = s => tx(s, 'readonly', st => st.getAll());
const uno = (s, id) => tx(s, 'readonly', st => st.get(id));
const salva = (s, v) => tx(s, 'readwrite', st => st.put(v));
const elimina = (s, id) => tx(s, 'readwrite', st => st.delete(id));

// senza questo Safari può cancellare i dati dopo settimane di inutilizzo
navigator.storage?.persist?.();

function leggiImpostazioni() {
  try { return { attrezzi: ['roner', 'biberon'], salti: {}, apiKey: '', ...JSON.parse(localStorage.getItem('chez-moi') || '{}') }; }
  catch { return { attrezzi: ['roner', 'biberon'], salti: {}, apiKey: '' }; }
}
let imp = leggiImpostazioni();
function salvaImpostazioni() {
  try { localStorage.setItem('chez-moi', JSON.stringify(imp)); } catch { alert('Impossibile salvare le impostazioni su questo dispositivo.'); }
}

// ---------- utilità ----------

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const oggi = () => new Date().toISOString().slice(0, 10);
const nuovoId = () => crypto.randomUUID();
const dataBella = iso => new Date(iso + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
const stelle = n => '★'.repeat(n) + '☆'.repeat(5 - n);

let urlFoto = [];
function fotoUrl(blob) {
  const u = URL.createObjectURL(blob);
  urlFoto.push(u);
  return u;
}

// riduce le foto del telefono (5–10 MB) a ~300 KB
async function riduci(file) {
  const img = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.82));
}

async function fotoDaForm(form, vecchia) {
  const f = form.foto.files[0];
  return f ? riduci(f) : vecchia ?? null;
}

// ---------- navigazione ----------

let vista = 'sfida';
let ricettaAperta = null;

document.querySelector('nav').addEventListener('click', e => {
  const b = e.target.closest('[data-vista]');
  if (!b) return;
  vista = b.dataset.vista;
  ricettaAperta = null;
  disegna();
});

async function disegna() {
  urlFoto.forEach(URL.revokeObjectURL);
  urlFoto = [];
  document.querySelectorAll('nav [data-vista]').forEach(b => b.setAttribute('aria-current', b.dataset.vista === vista));
  $('#vista').innerHTML = await VISTE[vista]();
  window.scrollTo(0, 0);
}

// ---------- viste ----------

function sfidaCorrente() {
  const w = settimana();
  return sfidaDellaSettimana(SFIDE, imp.attrezzi, w, imp.salti[w] || 0);
}

const VISTE = {
  async sfida() {
    const s = sfidaCorrente();
    const diario = await tutti('diario');
    const fatte = diario.filter(d => d.sfida).length;
    const giaFatta = diario.some(d => d.sfida === s.titolo && d.settimana === settimana());
    return `
      <h1>Sfida della settimana</h1>
      <article class="card sfida">
        <h2 class="nastro">${esc(s.titolo)}</h2>
        <p class="chips">${(s.attrezzi.length ? s.attrezzi.map(a => ATTREZZI[a]) : ['Cucina di base']).map(a => `<span>${esc(a)}</span>`).join('')}</p>
        <p>${esc(s.testo)}</p>
        <p><a href="https://www.youtube.com/results?search_query=${encodeURIComponent(s.cerca)}" target="_blank" rel="noopener">▶ Guarda come si fa su YouTube</a></p>
        ${giaFatta ? '<p class="fatta">✓ Fatta questa settimana. Bravo!</p>' : '<button class="primario" data-az="sfida-fatta">L’ho fatta: aggiungi al diario</button>'}
        <button class="secondario" data-az="sfida-cambia">Cambia sfida</button>
      </article>
      <p class="nota">Sfide completate in tutto: <strong>${fatte}</strong></p>`;
  },

  async diario() {
    const voci = (await tutti('diario')).sort((a, b) => b.data.localeCompare(a.data));
    return `
      <h1>Diario</h1>
      <button class="primario" data-az="diario-nuovo">+ Nuovo piatto</button>
      ${voci.length ? '' : '<p class="nota">Qui finiscono i piatti che cucini: foto, voto e cosa migliorare la prossima volta.</p>'}
      ${voci.map(d => `
        <article class="card">
          ${d.foto ? `<img src="${fotoUrl(d.foto)}" alt="${esc(d.piatto)}">` : ''}
          <h2>${esc(d.piatto)}</h2>
          <p class="meta">${dataBella(d.data)} · <span class="stelle" aria-label="${d.voto} su 5">${stelle(d.voto)}</span>${d.sfida ? ' · sfida' : ''}</p>
          ${d.note ? `<p class="testo">${esc(d.note)}</p>` : ''}
          <div class="azioni-riga">
            <button class="testuale" data-az="diario-modifica" data-id="${d.id}">Modifica</button>
            <button class="testuale pericolo" data-az="diario-elimina" data-id="${d.id}">Elimina</button>
          </div>
        </article>`).join('')}`;
  },

  async ricette() {
    if (ricettaAperta) return dettaglioRicetta(await uno('ricette', ricettaAperta));
    const r = (await tutti('ricette')).sort((a, b) => a.titolo.localeCompare(b.titolo));
    return `
      <h1>Ricettario</h1>
      <button class="primario" data-az="ricetta-nuova">+ Nuova ricetta</button>
      ${r.length ? '<input type="search" id="cerca" placeholder="Cerca…" aria-label="Cerca ricetta">' : '<p class="nota">Nessuna ricetta. Scrivine una o fattela proporre dallo Chef.</p>'}
      <ul class="lista">${r.map(x => `<li><button data-az="ricetta-apri" data-id="${x.id}">${esc(x.titolo)}</button></li>`).join('')}</ul>`;
  },

  async chef() {
    if (!imp.apiKey) return `
      <h1>Chef</h1>
      <p class="nota">Per usare lo Chef serve una chiave API di Anthropic: creala su <a href="https://console.anthropic.com" target="_blank" rel="noopener">console.anthropic.com</a> e incollala nelle Impostazioni. Ogni ricetta costa pochi centesimi.</p>
      <button class="secondario" data-az="vai-impostazioni">Inserisci la chiave API</button>`;
    return `
      <h1>Chef</h1>
      <form id="chef-form" class="card">
        <label>Cosa hai a disposizione?<textarea name="ingredienti" rows="3" placeholder="es. petto d’anatra, arance, sedano rapa…"></textarea></label>
        <label>Cosa ti va?<input name="richiesta" placeholder="es. secondo per 2, max 2 ore"></label>
        <p class="nota">Attrezzi che userà: ${imp.attrezzi.map(a => esc(ATTREZZI[a])).join(', ') || 'solo cucina di base'}</p>
        <button class="primario">Proponimi una ricetta</button>
      </form>
      <div id="chef-esito"></div>`;
  },

  async impostazioni() {
    return `
      <h1>Opzioni</h1>
      <form id="imp-form" class="card">
        <fieldset><legend>Attrezzi</legend>
          ${Object.entries(ATTREZZI).map(([k, v]) => `<label class="riga"><input type="checkbox" name="attrezzi" value="${k}" ${imp.attrezzi.includes(k) ? 'checked' : ''}> ${esc(v)}</label>`).join('')}
        </fieldset>
        <label>Chiave API Anthropic (resta solo su questo telefono)<input name="apiKey" type="password" autocomplete="off" value="${esc(imp.apiKey)}" placeholder="sk-ant-…"></label>
        <button class="primario">Salva</button>
        <p class="nota" id="imp-stato" role="status"></p>
      </form>
      <article class="card">
        <h2>Backup</h2>
        <p class="nota">Diario e ricette sono salvati solo su questo telefono. Esporta ogni tanto un backup.</p>
        <div class="azioni-riga">
          <button data-az="esporta">Esporta backup</button>
          <label class="bottone">Importa backup<input type="file" id="importa" accept="application/json,.json" hidden></label>
        </div>
        <p class="nota" id="backup-stato" role="status"></p>
      </article>`;
  },
};

function dettaglioRicetta(r) {
  if (!r) { ricettaAperta = null; return VISTE.ricette(); }
  const yt = youtubeId(r.video);
  return `
    <button class="testuale" data-az="ricetta-indietro">‹ Ricettario</button>
    <h1>${esc(r.titolo)}</h1>
    ${r.foto ? `<img src="${fotoUrl(r.foto)}" alt="">` : ''}
    ${yt ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${yt}" title="Video" allowfullscreen loading="lazy"></iframe></div>` : ''}
    ${r.ingredienti ? `<h2>Ingredienti</h2><p class="testo">${esc(r.ingredienti)}</p>` : ''}
    ${r.procedimento ? `<h2>Procedimento</h2><p class="testo">${esc(r.procedimento)}</p>` : ''}
    <button class="primario" data-az="ricetta-cucinata" data-id="${r.id}">L’ho cucinata: aggiungi al diario</button>
    <div class="azioni-riga">
      <button class="testuale" data-az="ricetta-modifica" data-id="${r.id}">Modifica</button>
      <button class="testuale pericolo" data-az="ricetta-elimina" data-id="${r.id}">Elimina</button>
    </div>`;
}

// ---------- moduli (dialog) ----------

function apriModulo(titolo, campi, alSalvataggio) {
  const dlg = $('#modulo');
  dlg.innerHTML = `<form method="dialog">
    <div class="testata"><button value="annulla" formnovalidate>Annulla</button><h2>${esc(titolo)}</h2><button value="ok">Salva</button></div>
    ${campi}</form>`;
  const form = dlg.querySelector('form');
  form.onsubmit = async e => {
    if (e.submitter?.value !== 'ok') return;
    e.preventDefault();
    e.submitter.disabled = true;
    try {
      await alSalvataggio(form);
      dlg.close();
      disegna();
    } catch (err) {
      e.submitter.disabled = false;
      alert('Errore nel salvataggio: ' + err.message);
    }
  };
  dlg.showModal();
}

function moduloDiario(d = {}) {
  apriModulo(d.id ? 'Modifica piatto' : 'Nuovo piatto', `
    <label>Piatto<input name="piatto" required value="${esc(d.piatto)}"></label>
    <label>Data<input name="data" type="date" required value="${esc(d.data || oggi())}"></label>
    <label>Foto<input name="foto" type="file" accept="image/*"></label>
    <label>Voto<select name="voto">${[5, 4, 3, 2, 1].map(n => `<option value="${n}" ${n === (d.voto || 3) ? 'selected' : ''}>${stelle(n)}</option>`).join('')}</select></label>
    <label>Note (cosa è venuto bene, cosa migliorare)<textarea name="note" rows="4">${esc(d.note)}</textarea></label>`,
  async f => salva('diario', {
    ...d,
    id: d.id || nuovoId(),
    piatto: f.piatto.value.trim(),
    data: f.data.value,
    voto: +f.voto.value,
    note: f.note.value.trim(),
    foto: await fotoDaForm(f, d.foto),
  }));
}

function moduloRicetta(r = {}) {
  apriModulo(r.id ? 'Modifica ricetta' : 'Nuova ricetta', `
    <label>Titolo<input name="titolo" required value="${esc(r.titolo)}"></label>
    <label>Ingredienti (uno per riga)<textarea name="ingredienti" rows="6">${esc(r.ingredienti)}</textarea></label>
    <label>Procedimento<textarea name="procedimento" rows="8">${esc(r.procedimento)}</textarea></label>
    <label>Link video YouTube<input name="video" type="url" value="${esc(r.video)}" placeholder="https://youtu.be/…"></label>
    <label>Foto<input name="foto" type="file" accept="image/*"></label>`,
  async f => {
    const id = r.id || nuovoId();
    await salva('ricette', {
      ...r,
      id,
      titolo: f.titolo.value.trim(),
      ingredienti: f.ingredienti.value.trim(),
      procedimento: f.procedimento.value.trim(),
      video: f.video.value.trim(),
      foto: await fotoDaForm(f, r.foto),
    });
    ricettaAperta = id;
  });
}

// ---------- azioni ----------

const AZIONI = {
  'sfida-fatta': () => moduloDiario({ piatto: sfidaCorrente().titolo, sfida: sfidaCorrente().titolo, settimana: settimana() }),
  'sfida-cambia': () => {
    const w = settimana();
    imp.salti = { [w]: (imp.salti[w] || 0) + 1 }; // tiene solo la settimana corrente
    salvaImpostazioni();
    disegna();
  },
  'diario-nuovo': () => moduloDiario(),
  'diario-modifica': async id => moduloDiario(await uno('diario', id)),
  'diario-elimina': async id => { if (confirm('Eliminare questo piatto dal diario?')) { await elimina('diario', id); disegna(); } },
  'ricetta-nuova': () => moduloRicetta(),
  'ricetta-apri': id => { ricettaAperta = id; disegna(); },
  'ricetta-indietro': () => { ricettaAperta = null; disegna(); },
  'ricetta-modifica': async id => moduloRicetta(await uno('ricette', id)),
  'ricetta-elimina': async id => { if (confirm('Eliminare questa ricetta?')) { await elimina('ricette', id); ricettaAperta = null; disegna(); } },
  'ricetta-cucinata': async id => moduloDiario({ piatto: (await uno('ricette', id)).titolo }),
  'vai-impostazioni': () => { vista = 'impostazioni'; disegna(); },
  'chef-salva': async () => {
    const r = ultimaProposta;
    const id = nuovoId();
    await salva('ricette', {
      id,
      titolo: r.titolo,
      ingredienti: r.ingredienti.join('\n'),
      procedimento: r.passaggi.map((p, i) => `${i + 1}. ${p}`).join('\n\n') + `\n\nImpiattamento: ${r.impiattamento}`,
      video: '',
      foto: null,
    });
    vista = 'ricette';
    ricettaAperta = id;
    disegna();
  },
  'chef-altra': () => $('#chef-form').requestSubmit(),
  esporta,
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-az]');
  if (b) AZIONI[b.dataset.az](b.dataset.id);
});

document.addEventListener('input', e => {
  if (e.target.id !== 'cerca') return;
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('.lista li').forEach(li => { li.hidden = !li.textContent.toLowerCase().includes(q); });
});

document.addEventListener('submit', async e => {
  if (e.target.id === 'imp-form') {
    e.preventDefault();
    const f = e.target;
    imp.attrezzi = [...f.querySelectorAll('[name=attrezzi]:checked')].map(c => c.value);
    imp.apiKey = f.apiKey.value.trim();
    salvaImpostazioni();
    $('#imp-stato').textContent = 'Salvato.';
  }
  if (e.target.id === 'chef-form') {
    e.preventDefault();
    chiediAlloChef(e.target);
  }
});

document.addEventListener('change', e => { if (e.target.id === 'importa') importa(e.target.files[0]); });

// ---------- Chef AI ----------

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['titolo', 'descrizione', 'tempo', 'ingredienti', 'passaggi', 'impiattamento'],
  properties: {
    titolo: { type: 'string' },
    descrizione: { type: 'string' },
    tempo: { type: 'string' },
    ingredienti: { type: 'array', items: { type: 'string' } },
    passaggi: { type: 'array', items: { type: 'string' } },
    impiattamento: { type: 'string' },
  },
};

let ultimaProposta = null;

async function chiediAlloChef(form) {
  const esito = $('#chef-esito');
  const bottone = form.querySelector('button');
  bottone.disabled = true;
  esito.innerHTML = '<p class="nota" role="status">Lo chef sta scegliendo la tecnica e scrivendo la ricetta. Di solito ci vuole meno di un minuto.</p>';
  try {
    // caricato solo qui, così il resto dell'app funziona anche offline
    const { default: Anthropic } = await import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.131.0/+esm');
    const client = new Anthropic({ apiKey: imp.apiKey, dangerouslyAllowBrowser: true });
    try {
      const r = await client.beta.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
        system: 'Sei uno chef di alta cucina. Aiuti un cuoco amatoriale esperto, che ha fatto corsi professionali, a ritrovare la passione per la cucina. Proponi una sola ricetta gourmet ma realizzabile in una cucina di casa, che metta in pratica una tecnica interessante. Usa gli attrezzi disponibili quando hanno senso. Per le cotture sottovuoto indica temperature e tempi sicuri dal punto di vista alimentare. Dosi in grammi. Scrivi in italiano.',
        messages: [{
          role: 'user',
          content: `Ingredienti disponibili: ${form.ingredienti.value.trim() || 'nessun vincolo, sorprendimi'}\nRichiesta: ${form.richiesta.value.trim() || 'nessuna'}\nAttrezzi: ${imp.attrezzi.map(a => ATTREZZI[a]).join(', ') || 'solo cucina di base'}`,
        }],
      });
      if (r.stop_reason === 'refusal') throw new Error('lo chef non ha voluto rispondere a questa richiesta. Prova a riformularla.');
      if (r.stop_reason === 'max_tokens') throw new Error('la risposta è stata troncata. Riprova.');
      ultimaProposta = JSON.parse(r.content.find(b => b.type === 'text').text);
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) throw new Error('la chiave API non è valida. Controllala nelle Impostazioni.');
      if (err instanceof Anthropic.RateLimitError) throw new Error('troppe richieste, riprova tra un minuto.');
      if (err instanceof Anthropic.APIConnectionError) throw new Error('connessione assente.');
      throw err;
    }
    const p = ultimaProposta;
    esito.innerHTML = `
      <article class="card">
        <h2>${esc(p.titolo)}</h2>
        <p>${esc(p.descrizione)}</p>
        <p class="meta">⏱ ${esc(p.tempo)}</p>
        <h3>Ingredienti</h3><ul>${p.ingredienti.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
        <h3>Procedimento</h3><ol>${p.passaggi.map(i => `<li>${esc(i)}</li>`).join('')}</ol>
        <h3>Impiattamento</h3><p>${esc(p.impiattamento)}</p>
        <button class="primario" data-az="chef-salva">Salva nel ricettario</button>
        <button class="secondario" data-az="chef-altra">Proponine un’altra</button>
      </article>`;
  } catch (err) {
    esito.innerHTML = `<p class="errore">Errore: ${esc(err.message)}</p>`;
  } finally {
    bottone.disabled = false;
  }
}

// ---------- backup ----------

const aDataUrl = blob => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });

async function esporta() {
  const conFoto = async xs => Promise.all(xs.map(async x => ({ ...x, foto: x.foto && await aDataUrl(x.foto) })));
  const dati = { versione: 1, diario: await conFoto(await tutti('diario')), ricette: await conFoto(await tutti('ricette')) };
  const file = new File([JSON.stringify(dati)], `chez-moi-backup-${oggi()}.json`, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file] }).catch(() => {});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
}

async function importa(file) {
  try {
    const dati = JSON.parse(await file.text());
    if (dati.versione !== 1 || !Array.isArray(dati.diario) || !Array.isArray(dati.ricette)) throw new Error('non è un backup di Chez moi');
    for (const store of ['diario', 'ricette']) {
      for (const x of dati[store]) {
        if (!x.id) continue;
        const foto = String(x.foto).startsWith('data:image/') ? await (await fetch(x.foto)).blob() : null;
        await salva(store, { ...x, foto });
      }
    }
    $('#backup-stato').textContent = `Importati ${dati.diario.length} piatti e ${dati.ricette.length} ricette.`;
  } catch (err) {
    $('#backup-stato').textContent = 'Importazione non riuscita: ' + err.message + '. Scegli un file esportato da Chez moi.';
  }
}

// ---------- avvio ----------

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
disegna();
