import { SFIDE, ATTREZZI } from './sfide.js';
import { settimana, sfidaDellaSettimana, youtubeId, ingredienti, passaggi, minuti, perCategoria, sfideAnno, CATEGORIE } from './logic.js';

// ---------- dati (API del Worker, dietro Cloudflare Access) ----------

async function api(metodo, percorso, corpo) {
  let r;
  try {
    r = await fetch(`/api/${percorso}`, {
      method: metodo,
      headers: corpo instanceof Blob ? { 'content-type': corpo.type } : corpo ? { 'content-type': 'application/json' } : {},
      body: corpo instanceof Blob ? corpo : corpo && JSON.stringify(corpo),
    });
  } catch {
    // offline, oppure la sessione di Access è scaduta (il login non passa da fetch)
    throw new Error('non riesco a raggiungere il server. Controlla la connessione, poi chiudi e riapri l’app.');
  }
  const dati = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dati.error || `errore ${r.status}`);
  return dati;
}
// elenchi già scaricati: cambiare scheda non aspetta la rete. Si svuota dopo ogni modifica e a ogni ritorno nell'app.
const memoria = new Map();
const tutti = s => {
  if (!memoria.has(s)) memoria.set(s, api('GET', s).catch(e => { memoria.delete(s); throw e; }));
  return memoria.get(s);
};
const uno = async (s, id) => (await tutti(s)).find(x => x.id === id);
const scrivi = async (s, metodo, id, v) => { const r = await api(metodo, `${s}/${id}`, v); memoria.delete(s); return r; };
const salva = (s, v) => scrivi(s, 'PUT', v.id, v);
const elimina = (s, id) => scrivi(s, 'DELETE', id);

function leggiImpostazioni() {
  try { return { attrezzi: ['roner', 'biberon'], salti: {}, ...JSON.parse(localStorage.getItem('chez-moi') || '{}') }; }
  catch { return { attrezzi: ['roner', 'biberon'], salti: {} }; }
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
const stelle = n => '★'.repeat(n) + '☆'.repeat(5 - n);
const nomeMese = ym => new Date(ym + '-15').toLocaleDateString('it-IT', { month: 'long', year: ym.slice(0, 4) === oggi().slice(0, 4) ? undefined : 'numeric' });
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// mini: la miniatura da ~640 px per griglie e muro
const fotoUrl = (chiave, mini) => `/api/${chiave}${mini ? '?mini' : ''}`;

const ICONE = {
  indietro: '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  piu: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
};
const icona = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONE[n]}</svg>`;

// firma della direzione D: un quadrante come quello del roner
const quadrante = (t, etichetta) => `
  <div class="quadrante" role="img" aria-label="${t} gradi, ${esc(etichetta)}">
    <svg viewBox="0 0 92 92" aria-hidden="true"><circle class="traccia" cx="46" cy="46" r="38"/><circle class="arco" cx="46" cy="46" r="38" pathLength="100" stroke-dasharray="${t} 100"/></svg>
    <b>${t}°</b><span>${esc(etichetta)}</span>
  </div>`;

// riduce le foto del telefono (5–10 MB) a ~150 KB, la miniatura a ~40 KB
async function riduci(file, lato = 1200) {
  const img = await createImageBitmap(file);
  const k = Math.min(1, lato / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.82));
}

async function fotoDaForm(form, vecchia) {
  const f = form.foto.files[0];
  if (!f) return vecchia ?? null;
  const { foto } = await api('POST', 'foto', await riduci(f));
  await api('POST', `${foto}/mini`, await riduci(f, 640)).catch(() => {}); // senza miniatura si vede la foto intera
  return foto;
}

// ---------- navigazione ----------

let vista = 'sfida';
let ricettaAperta = null;
let filtro = ''; // categoria scelta nel ricettario, '' = tutte
let cucina = null; // { id, passo } in modalità cucina
// spunte della mise en place: valgono finché l'app resta aperta
const spunte = new Set();

document.querySelector('nav').addEventListener('click', e => {
  const b = e.target.closest('[data-vista]');
  if (!b) return;
  vista = b.dataset.vista;
  ricettaAperta = null;
  disegna();
});

let giro = 0;
async function disegna() {
  const mio = ++giro;
  document.querySelectorAll('nav [data-vista]').forEach(b => b.setAttribute('aria-current', b.dataset.vista === (vista === 'cucina' ? 'ricette' : vista)));
  document.body.classList.toggle('in-cucina', vista === 'cucina');
  let html;
  try { html = await VISTE[vista](); }
  catch (err) { html = `<p class="errore" role="alert">Errore: ${esc(err.message)}</p><button class="secondario" data-az="riprova">Riprova</button>`; }
  if (mio !== giro) return; // nel frattempo è stata aperta un'altra schermata
  $('#vista').innerHTML = html;
  $('#vista').removeAttribute('aria-busy');
  window.scrollTo(0, 0);
}

// ---------- viste ----------

function sfidaCorrente() {
  const w = settimana();
  return sfidaDellaSettimana(SFIDE, imp.attrezzi, w, imp.salti[w] || 0);
}

const attrezziDi = s => (s.attrezzi.length ? s.attrezzi.map(a => ATTREZZI[a]) : ['cucina di base']).join(', ');

const VISTE = {
  async sfida() {
    const s = sfidaCorrente();
    const w = settimana();
    const diario = await tutti('diario');
    const fatte = diario.filter(d => d.sfida).length;
    const giaFatta = diario.some(d => d.sfida === s.titolo && d.settimana === w);
    const foto = diario.find(d => d.sfida === s.titolo && d.foto)?.foto;
    return `
      <section class="hero${foto ? ' con-foto' : ''}"${foto ? ` style="background-image: linear-gradient(rgb(18 18 18 / .05), rgb(18 18 18 / .9)), url('${fotoUrl(foto)}')"` : ''}>
        <div>
          <p class="occhiello">Sfida della settimana</p>
          <h1>${esc(s.titolo)}</h1>
          <p class="meta">${esc(s.tempo)} · ${esc(attrezziDi(s))}</p>
        </div>
        ${s.temp ? quadrante(s.temp, s.attrezzi.includes('roner') ? 'roner' : 'al cuore') : ''}
      </section>
      <p>${esc(s.testo)}</p>
      <fieldset class="gruppo"><legend>Mise en place</legend>
        ${s.mise.map((m, i) => `<label><input type="checkbox" data-spunta="${w}:${i}" ${spunte.has(`${w}:${i}`) ? 'checked' : ''}><span>${esc(m)}</span></label>`).join('')}
      </fieldset>
      <p><a class="link" href="https://www.youtube.com/results?search_query=${encodeURIComponent(s.cerca)}" target="_blank" rel="noopener">${icona('play')} Guarda come si fa</a></p>
      ${giaFatta ? '<p class="fatta">✓ Fatta questa settimana</p>' : '<button class="primario" data-az="sfida-fatta">L’ho fatta: aggiungi al diario</button>'}
      <button class="secondario" data-az="sfida-cambia">Cambia sfida</button>
      <p class="nota">Sfide completate in tutto: <strong>${fatte}</strong></p>`;
  },

  async diario() {
    const voci = await tutti('diario'); // già in ordine dal server
    const chiave = settimana();
    const anno = sfideAnno(voci, chiave);
    const mese = oggi().slice(0, 7);
    const migliore = voci.filter(d => d.data.startsWith(mese)).sort((a, b) => b.voto - a.voto || !!b.foto - !!a.foto)[0];
    const mesi = new Map();
    for (const d of voci) {
      const k = d.data.slice(0, 7);
      if (!mesi.has(k)) mesi.set(k, []);
      mesi.get(k).push(d);
    }
    return `
      <div class="titolo-riga"><h1>Diario</h1><button class="tondo" data-az="diario-nuovo" aria-label="Aggiungi un piatto">${icona('piu')}</button></div>
      <section class="riquadro">
        <div class="titolo-riga"><b>Sfide del ${chiave.split('-')[0]}</b><span class="meta">${anno.filter(Boolean).length} fatte su ${anno.length}</span></div>
        <div class="anno" aria-hidden="true">${anno.map(f => `<span${f ? ' class="fatta"' : ''}></span>`).join('')}</div>
      </section>
      ${voci.length ? '' : '<p class="nota">Qui finiscono i piatti che cucini: foto, voto e cosa migliorare la prossima volta.</p>'}
      ${migliore ? `
        <button class="riquadro migliore" data-az="diario-modifica" data-id="${migliore.id}">
          ${migliore.foto ? `<img src="${fotoUrl(migliore.foto)}" alt="" loading="lazy">` : ''}
          <span class="occhiello">Il migliore di ${esc(nomeMese(mese))}</span>
          <b>${esc(migliore.piatto)}</b>
          <span class="meta"><span class="stelle" aria-label="${migliore.voto} su 5">${stelle(migliore.voto)}</span>${migliore.note ? ` · ${esc(migliore.note)}` : ''}</span>
        </button>` : ''}
      ${[...mesi].map(([ym, xs]) => `
        <h2 class="sezione">${esc(nomeMese(ym))}</h2>
        <div class="muro">${xs.map(d => `
          <button class="tessera" data-az="diario-modifica" data-id="${d.id}" aria-label="${esc(d.piatto)}, ${d.voto} su 5">
            ${d.foto ? `<img src="${fotoUrl(d.foto, true)}" alt="" loading="lazy">` : ''}
            <span>${esc(d.piatto)}</span>
          </button>`).join('')}</div>`).join('')}`;
  },

  async ricette() {
    if (ricettaAperta) return dettaglioRicetta(await uno('ricette', ricettaAperta));
    const gruppi = perCategoria(await tutti('ricette'));
    if (!gruppi.some(([c]) => c === filtro)) filtro = '';
    return `
      <div class="titolo-riga"><h1>Ricette</h1><button class="tondo" data-az="ricetta-nuova" aria-label="Nuova ricetta">${icona('piu')}</button></div>
      ${gruppi.length ? `
        <input type="search" id="cerca" placeholder="Cerca…" aria-label="Cerca ricetta">
        <div class="filtri">${[['', 'Tutte'], ...gruppi.map(([c]) => [c, c])].map(([c, nome]) => `<button class="chip" data-az="ricette-filtro" data-id="${esc(c)}" aria-pressed="${c === filtro}">${esc(nome)}</button>`).join('')}</div>`
      : '<p class="nota">Nessuna ricetta. Scrivine una o fattela proporre dallo Chef.</p>'}
      ${gruppi.map(([c, xs]) => `
        <section class="categoria" data-categoria="${esc(c)}"${filtro && c !== filtro ? ' hidden' : ''}>
          <h2 class="sezione">${esc(c)}</h2>
          <div class="griglia">${xs.map(x => {
            const n = passaggi(x.procedimento).length;
            return `<button class="scheda" data-az="ricetta-apri" data-id="${x.id}">
              ${x.foto ? `<img src="${fotoUrl(x.foto, true)}" alt="" loading="lazy">` : '<span class="senza-foto" aria-hidden="true"></span>'}
              <b>${esc(x.titolo)}</b>${n ? `<span class="meta">${n} passaggi</span>` : ''}
            </button>`;
          }).join('')}</div>
        </section>`).join('')}`;
  },

  async cucina() {
    const r = await uno('ricette', cucina.id);
    const pas = passaggi(r?.procedimento);
    if (!pas.length) { vista = 'ricette'; return VISTE.ricette(); }
    const i = Math.min(cucina.passo, pas.length - 1);
    const min = minuti(pas[i]);
    return `
      <div class="cucina">
        <div class="titolo-riga"><button class="pillola" data-az="cucina-fine">Fine</button><span class="meta">${esc(r.titolo)}</span></div>
        <div class="titolo-riga"><span class="accento">Passaggio ${i + 1} di ${pas.length}</span><span class="meta" id="schermo">${wakeLock ? 'Schermo acceso' : ''}</span></div>
        <div class="progresso" role="progressbar" aria-label="Avanzamento" aria-valuemin="1" aria-valuemax="${pas.length}" aria-valuenow="${i + 1}">${pas.map((_, k) => `<span${k <= i ? ' class="fatto"' : ''}></span>`).join('')}</div>
        <p class="passo">${esc(pas[i])}</p>
        ${min ? `
          <div class="riquadro timer">
            <div class="quadrante">
              <svg viewBox="0 0 92 92" aria-hidden="true"><circle class="traccia" cx="46" cy="46" r="38"/><circle class="arco" id="arco" cx="46" cy="46" r="38" pathLength="100" stroke-dasharray="100 100"/></svg>
              <b id="timer" role="timer">${mmss(min * 60)}</b>
            </div>
            <button class="secondario" data-az="timer" data-id="${min}">Avvia timer</button>
          </div>` : ''}
        <div class="piede">
          <button class="secondario" data-az="cucina-passo" data-id="-1" ${i === 0 ? 'disabled' : ''}>Indietro</button>
          ${i < pas.length - 1 ? '<button class="primario" data-az="cucina-passo" data-id="1">Avanti</button>' : '<button class="primario" data-az="cucina-finito">Fatto</button>'}
        </div>
      </div>`;
  },

  async chef() {
    return `
      <h1>Chef</h1>
      <form id="chef-form" class="riquadro">
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
      <form id="imp-form">
        <fieldset class="gruppo"><legend>Attrezzi</legend>
          ${Object.entries(ATTREZZI).map(([k, v]) => `<label><input type="checkbox" name="attrezzi" value="${k}" ${imp.attrezzi.includes(k) ? 'checked' : ''}><span>${esc(v)}</span></label>`).join('')}
        </fieldset>
        <button class="primario">Salva</button>
        <p class="nota" id="imp-stato" role="status"></p>
      </form>`;
  },
};

function dettaglioRicetta(r) {
  if (!r) { ricettaAperta = null; return VISTE.ricette(); }
  const yt = youtubeId(r.video);
  const ing = ingredienti(r.ingredienti);
  const pas = passaggi(r.procedimento);
  const pronti = ing.filter((_, i) => spunte.has(`${r.id}:${i}`)).length;
  return `
    <button class="testuale indietro" data-az="ricetta-indietro">${icona('indietro')} Ricette</button>
    ${r.foto ? `<img class="foto-testa" src="${fotoUrl(r.foto)}" alt="">` : ''}
    ${r.foto_credito ? `<p class="credito">Foto: ${esc(r.foto_credito)}</p>` : ''}
    <h1>${esc(r.titolo)}</h1>
    <p class="meta">${[r.categoria, ing.length && `${ing.length} ingredienti`, pas.length && `${pas.length} passaggi`].filter(Boolean).map(esc).join(' · ')}</p>
    ${yt ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${yt}" title="Video" allowfullscreen loading="lazy"></iframe></div>` : ''}
    ${ing.length ? `
      <div class="titolo-riga"><h2>Mise en place</h2><span class="meta" id="pronti" role="status">${pronti} su ${ing.length} pronti</span></div>
      <div class="mise">${ing.map((x, i) => `
        <button class="ingrediente" data-az="ingrediente" data-id="${r.id}:${i}" aria-pressed="${spunte.has(`${r.id}:${i}`)}">${x.dose ? `<b>${esc(x.dose)}</b>` : ''}<span>${esc(x.nome)}</span></button>`).join('')}
      </div>` : ''}
    ${pas.length ? `
      <button class="primario" data-az="cucina-apri" data-id="${r.id}">${icona('play')} Modalità cucina</button>
      <h2>Procedimento</h2>
      <ol class="passaggi">${pas.map(p => `<li>${esc(p)}</li>`).join('')}</ol>` : ''}
    <button class="secondario" data-az="ricetta-cucinata" data-id="${r.id}">L’ho cucinata: aggiungi al diario</button>
    <div class="azioni-riga">
      <button class="testuale" data-az="ricetta-modifica" data-id="${r.id}">Modifica</button>
      <button class="testuale pericolo" data-az="ricetta-elimina" data-id="${r.id}">Elimina</button>
    </div>`;
}

// ---------- modalità cucina: timer e schermo acceso ----------

let wakeLock = null;
async function tieniAcceso() {
  try { wakeLock = (await navigator.wakeLock?.request('screen')) ?? null; } catch { wakeLock = null; }
  const e = $('#schermo');
  if (e) e.textContent = wakeLock ? 'Schermo acceso' : '';
}
function rilascia() { wakeLock?.release().catch(() => {}); wakeLock = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && vista === 'cucina') tieniAcceso(); });

// shortcut: a schermo bloccato iOS sospende la pagina, il suono arriva solo al ritorno; per un avviso vero servirebbe una notifica push
let timer = null; // { fine, tot, intervallo }
let audio = null;
function fermaTimer() { if (timer) clearInterval(timer.intervallo); timer = null; }
function suona() {
  navigator.vibrate?.([200, 100, 200]);
  if (!audio) return;
  for (let k = 0; k < 3; k++) {
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.frequency.value = 880;
    g.gain.value = 0.2;
    o.connect(g).connect(audio.destination);
    const t = audio.currentTime + k * 0.4;
    o.start(t);
    o.stop(t + 0.2);
  }
}
function avviaTimer(min, bottone) {
  if (timer) { fermaTimer(); bottone.textContent = 'Avvia timer'; $('#timer').textContent = mmss(min * 60); $('#arco').style.strokeDashoffset = 0; return; }
  // l'audio di iOS si sblocca solo dentro un tocco
  audio ??= new AudioContext();
  audio.resume();
  bottone.textContent = 'Ferma';
  const tot = min * 60000;
  timer = { fine: Date.now() + tot, tot };
  const giro = () => {
    const t = $('#timer');
    if (!t) return fermaTimer();
    const resto = Math.max(0, timer.fine - Date.now());
    t.textContent = resto ? mmss(Math.ceil(resto / 1000)) : 'Tempo!';
    $('#arco').style.strokeDashoffset = 100 * (1 - resto / tot);
    if (!resto) { fermaTimer(); bottone.textContent = 'Avvia timer'; suona(); }
  };
  timer.intervallo = setInterval(giro, 250);
}

function esciDaCucina() {
  fermaTimer();
  rilascia();
  vista = 'ricette';
  ricettaAperta = cucina.id;
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
    ${d.foto ? `<img class="foto-testa" src="${fotoUrl(d.foto)}" alt="">` : ''}
    <label>Piatto<input name="piatto" required value="${esc(d.piatto)}"></label>
    <label>Data<input name="data" type="date" required value="${esc(d.data || oggi())}"></label>
    <label>Foto<input name="foto" type="file" accept="image/*"></label>
    <label>Voto<select name="voto">${[5, 4, 3, 2, 1].map(n => `<option value="${n}" ${n === (d.voto || 3) ? 'selected' : ''}>${stelle(n)}</option>`).join('')}</select></label>
    <label>Note (cosa è venuto bene, cosa migliorare)<textarea name="note" rows="4">${esc(d.note)}</textarea></label>
    ${d.id ? `<button type="button" class="testuale pericolo" data-az="diario-elimina" data-id="${d.id}">Elimina piatto</button>` : ''}`,
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
    <label>Categoria<input name="categoria" list="categorie" value="${esc(r.categoria)}"><datalist id="categorie">${CATEGORIE.map(c => `<option value="${c}">`).join('')}</datalist></label>
    <label>Ingredienti (uno per riga, es. «320 g riso Carnaroli»)<textarea name="ingredienti" rows="6">${esc(r.ingredienti)}</textarea></label>
    <label>Procedimento (un passaggio per riga: «18 minuti» diventa un timer)<textarea name="procedimento" rows="8">${esc(r.procedimento)}</textarea></label>
    <label>Link video YouTube<input name="video" type="url" value="${esc(r.video)}" placeholder="https://youtu.be/…"></label>
    <label>Foto<input name="foto" type="file" accept="image/*"></label>`,
  async f => {
    const id = r.id || nuovoId();
    await salva('ricette', {
      ...r,
      id,
      titolo: f.titolo.value.trim(),
      categoria: f.categoria.value.trim(),
      ingredienti: f.ingredienti.value.trim(),
      procedimento: f.procedimento.value.trim(),
      video: f.video.value.trim(),
      foto: await fotoDaForm(f, r.foto),
      foto_credito: f.foto.files[0] ? '' : r.foto_credito, // una foto propria non ha bisogno di credito
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
  'diario-elimina': async id => { if (confirm('Eliminare questo piatto dal diario?')) { await elimina('diario', id); $('#modulo').close(); disegna(); } },
  'ricetta-nuova': () => moduloRicetta(),
  'ricetta-apri': id => { ricettaAperta = id; disegna(); },
  'ricetta-indietro': () => { ricettaAperta = null; disegna(); },
  'ricetta-modifica': async id => moduloRicetta(await uno('ricette', id)),
  'ricetta-elimina': async id => { if (confirm('Eliminare questa ricetta?')) { await elimina('ricette', id); ricettaAperta = null; disegna(); } },
  'ricetta-cucinata': async id => moduloDiario({ piatto: (await uno('ricette', id)).titolo }),
  ingrediente: (k, b) => {
    spunte.has(k) ? spunte.delete(k) : spunte.add(k);
    b.setAttribute('aria-pressed', spunte.has(k));
    const tutti = [...document.querySelectorAll('.ingrediente')];
    $('#pronti').textContent = `${tutti.filter(x => x.getAttribute('aria-pressed') === 'true').length} su ${tutti.length} pronti`;
  },
  'cucina-apri': async id => { cucina = { id, passo: 0 }; vista = 'cucina'; await disegna(); tieniAcceso(); },
  'cucina-passo': d => { fermaTimer(); cucina.passo = Math.max(0, cucina.passo + +d); disegna(); },
  'cucina-fine': () => { esciDaCucina(); disegna(); },
  'cucina-finito': async () => { esciDaCucina(); await disegna(); AZIONI['ricetta-cucinata'](cucina.id); },
  timer: (min, b) => avviaTimer(+min, b),
  riprova: () => disegna(),
  'chef-salva': async () => {
    const r = ultimaProposta;
    const id = nuovoId();
    await salva('ricette', {
      id,
      titolo: r.titolo,
      categoria: 'Dallo Chef',
      ingredienti: r.ingredienti.join('\n'),
      procedimento: [...r.passaggi, `Impiattamento: ${r.impiattamento}`].join('\n'),
      video: '',
      foto: null,
    });
    vista = 'ricette';
    ricettaAperta = id;
    disegna();
  },
  'chef-altra': () => $('#chef-form').requestSubmit(),
  'ricette-filtro': c => {
    filtro = c;
    $('#cerca').value = '';
    document.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === c));
    document.querySelectorAll('.categoria').forEach(s => { s.hidden = !!c && s.dataset.categoria !== c; s.querySelectorAll('.scheda').forEach(x => { x.hidden = false; }); });
  },
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-az]');
  if (b) AZIONI[b.dataset.az](b.dataset.id, b);
});

document.addEventListener('change', e => {
  const k = e.target.dataset.spunta;
  if (k) e.target.checked ? spunte.add(k) : spunte.delete(k);
});

document.addEventListener('input', e => {
  if (e.target.id !== 'cerca') return;
  const q = e.target.value.toLowerCase();
  // la ricerca guarda in tutte le categorie, il filtro torna quando il campo si svuota
  document.querySelectorAll('.categoria').forEach(s => {
    const schede = [...s.querySelectorAll('.scheda')];
    schede.forEach(x => { x.hidden = !x.querySelector('b').textContent.toLowerCase().includes(q); });
    s.hidden = schede.every(x => x.hidden) || (!q && filtro && s.dataset.categoria !== filtro);
  });
});

// foto arrivata: si ferma il riflesso del segnaposto (load non risale: serve la cattura)
document.addEventListener('load', e => { if (e.target.tagName === 'IMG') e.target.classList.add('arrivata'); }, true);

document.addEventListener('submit', async e => {
  if (e.target.id === 'imp-form') {
    e.preventDefault();
    const f = e.target;
    imp.attrezzi = [...f.querySelectorAll('[name=attrezzi]:checked')].map(c => c.value);
    salvaImpostazioni();
    $('#imp-stato').textContent = 'Salvato.';
  }
  if (e.target.id === 'chef-form') {
    e.preventDefault();
    chiediAlloChef(e.target);
  }
});

// ---------- Chef AI ----------

let ultimaProposta = null;

async function chiediAlloChef(form) {
  const esito = $('#chef-esito');
  const bottone = form.querySelector('button');
  bottone.disabled = true;
  esito.innerHTML = '<p class="nota" role="status">Lo chef sta scegliendo la tecnica e scrivendo la ricetta. Di solito ci vuole meno di un minuto.</p>';
  try {
    ultimaProposta = await api('POST', 'chef', {
      ingredienti: form.ingredienti.value.trim(),
      richiesta: form.richiesta.value.trim(),
      attrezzi: imp.attrezzi.map(a => ATTREZZI[a]),
    });
    const p = ultimaProposta;
    esito.innerHTML = `
      <article class="riquadro">
        <h2>${esc(p.titolo)}</h2>
        <p>${esc(p.descrizione)}</p>
        <p class="meta">${esc(p.tempo)}</p>
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

// ---------- avvio ----------

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') memoria.clear(); });

if ('serviceWorker' in navigator) {
  // iOS tiene viva la pagina tra un cambio d'app e l'altro: a ogni ritorno cerca un deploy nuovo (come radar-eventi)
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
  // sw.js nuovo attivato (skipWaiting + claim): ricarica una volta per usare il codice nuovo; non alla prima installazione
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); });
}
disegna();
