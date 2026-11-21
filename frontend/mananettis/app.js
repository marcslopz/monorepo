import {
  normalizeName,
  charactersOfNames,
  speakingCharacters,
  visiblePlays,
  pickPlay,
  selectionLabel,
  isMyLine as isMyLineOf,
  isSkippable,
  stripParens,
  sceneStarts,
  findSceneStart,
  nextSceneIdx,
  prevSceneIdx,
  nextLineIdx,
  prevLineIdx,
  actorLabel,
  applyPatches,
  newPatch,
  patchesFromEdit,
  activePatches,
  describePatch,
  mergePatches,
  toApiPatch,
  pendingCount,
  withoutConsolidated,
  markUndo,
  markRedo,
} from "./lib.js";

const INDEX_URL = "plays/index.json";
const LAST_KEY = "mananettis:last"; // { play, actor } of the previous session, per browser

const DEVICE_KEY = "mananettis:device"; // random id of this browser, sent with each correction
const patchesKey = (slug) => `mananettis:patches:${slug}`;

let play = null;
let SCRIPT = []; // play.lines with the corrections applied
let myChars = new Set();
let patches = []; // corrections of the current play (undone ones included)
let author = ""; // actor chosen in "¿Quién eres?"; needed to correct

const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function readLast() {
  try { return JSON.parse(localStorage.getItem(LAST_KEY)) ?? {}; } catch { return {}; }
}
function saveLast(last) {
  try { localStorage.setItem(LAST_KEY, JSON.stringify(last)); } catch { /* private mode */ }
}

function readPatches(slug) {
  try { return JSON.parse(localStorage.getItem(patchesKey(slug))) ?? []; } catch { return []; }
}
function savePatches() {
  try { localStorage.setItem(patchesKey(play.slug), JSON.stringify(patches)); } catch { /* private mode */ }
}

// Shared corrections: /api/patches (Pages Function + D1). localStorage is the cache and the outbox.
const API = "api/patches";
let syncOk = null; // null = not tried yet, false = last attempt failed
let pushing = false;

async function postJson(url, body) {
  return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

// Server patches merged into the local ones, then whatever is still pending is sent.
async function pullPatches(slug) {
  try {
    const res = await fetch(`${API}?play=${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { patches: remote } = await res.json();
    if (play?.slug !== slug) return;
    patches = mergePatches(patches, withoutConsolidated(remote, play));
    savePatches();
    syncOk = true;
    onPatchesChanged();
  } catch {
    syncOk = false;
    updateSyncNote();
  }
  await pushPending();
}

function clearFlag(id, flag) {
  patches = patches.map((p) => {
    if (p.id !== id) return p;
    const { [flag]: _, ...rest } = p;
    return rest;
  });
}

// Sends pending patches, then pending undos. Network error or 5xx: stop and retry later
// (next correction, reload, or back online). 4xx: the server will never take it, stop retrying.
async function pushPending() {
  if (pushing || !play) return;
  pushing = true;
  const slug = play.slug;
  try {
    for (const p of patches.filter((x) => x.pending)) {
      const res = await postJson(API, toApiPatch(p, slug));
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) console.warn("Corrección rechazada por el servidor", p, await res.text());
      if (play?.slug !== slug) return;
      clearFlag(p.id, "pending");
      savePatches();
    }
    for (const [flag, path] of [["pendingUndo", "undo"], ["pendingRedo", "redo"]]) {
      for (const p of patches.filter((x) => x[flag] && !x.pending)) {
        const who = { author: author || readLast().actor || p.author, deviceId: deviceId() };
        const res = await postJson(`${API}/${path}`, { id: p.id, play: slug, ...who });
        if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
        if (play?.slug !== slug) return;
        clearFlag(p.id, flag);
        savePatches();
      }
    }
    syncOk = true;
  } catch {
    syncOk = false;
  } finally {
    pushing = false;
    updateSyncNote();
  }
}

window.addEventListener("online", () => pushPending());

function updateSyncNote() {
  if (!play) return;
  const waiting = pendingCount(patches);
  $("patchesBtn").textContent = `Correcciones (${activePatches(patches).length})${waiting ? " ⟳" : ""}`;
  $("syncNote").textContent = waiting
    ? `${waiting} sin enviar (sin conexión): se enviarán solas cuando vuelva.`
    : syncOk === false
      ? "No se pudo conectar: ves las correcciones guardadas en este dispositivo."
      : "Las correcciones se comparten con toda la clase.";
}

// New corrections from the server (or sent): re-apply wherever we are.
function onPatchesChanged() {
  if ($("player").style.display === "flex") {
    refreshScript();
    if ($("patchesDialog").open) renderCorrections();
  } else {
    SCRIPT = applyPatches(play.lines, patches);
    updateSyncNote();
  }
}

const uuid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) { id = uuid(); localStorage.setItem(DEVICE_KEY, id); }
    return id;
  } catch { return "sin-almacenamiento"; }
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function showLoadError(what, err) {
  $("subtitle").textContent = `No se pudo cargar ${what} (${err.message}). Recarga la página.`;
}

// ?play=<slug> picks the play, ?all=1 also lists the hidden ones.
async function loadIndex() {
  const params = new URLSearchParams(location.search);
  let index;
  try {
    index = await fetchJson(INDEX_URL);
  } catch (err) {
    showLoadError("la lista de obras", err);
    return;
  }
  const plays = visiblePlays(index, params.get("all") === "1");
  const chosen = pickPlay(plays, params.get("play") ?? readLast().play);
  if (!chosen) { $("subtitle").textContent = "No hay obras disponibles."; return; }
  $("playSelect").innerHTML = plays
    .map((p) => `<option value="${escapeHtml(p.slug)}">${escapeHtml(p.title)}</option>`)
    .join("");
  $("playSelect").value = chosen.slug;
  $("playField").style.display = plays.length > 1 ? "" : "none";
  $("playSelect").addEventListener("change", () => loadPlay($("playSelect").value));
  await loadPlay(chosen.slug);
}

async function loadPlay(slug) {
  play = null;
  $("actorSelect").innerHTML = '<option value="">Cargando guion...</option>';
  $("charList").innerHTML = "";
  let loaded;
  try {
    loaded = await fetchJson(`plays/${encodeURIComponent(slug)}.json`);
  } catch (err) {
    showLoadError("el guion", err);
    return;
  }
  if ($("playSelect").value && $("playSelect").value !== slug) return; // changed meanwhile
  play = loaded;
  patches = withoutConsolidated(readPatches(play.slug), play);
  SCRIPT = applyPatches(play.lines, patches);
  $("subtitle").textContent = "Apuntador Mañanettis";
  document.querySelectorAll(".play-title").forEach((el) => { el.textContent = play.title; });
  $("actorSelect").innerHTML =
    '<option value="">— Selecciona tu nombre —</option>' +
    play.cast.map((c) => `<option value="${escapeHtml(c.actor)}">${escapeHtml(actorLabel(c))}</option>`).join("");
  $("charList").innerHTML = speakingCharacters({ ...play, lines: SCRIPT })
    .map((name) => `<label class="char-chip"><input type="checkbox" value="${escapeHtml(name)}">${escapeHtml(name)}</label>`)
    .join("");
  const scenes = sceneStarts(SCRIPT);
  $("startFrom").innerHTML =
    '<option value="0">Desde el principio</option>' +
    scenes.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.title)}</option>`).join("");
  // Plays without scenes (Los peores ladrones): no scene picker, no scene buttons.
  $("startFromField").style.display = scenes.length ? "" : "none";
  $("sceneControls").style.display = scenes.length ? "" : "none";

  const last = readLast();
  if (last.play === play.slug && play.cast.some((c) => c.actor === last.actor)) {
    $("actorSelect").value = last.actor;
    checkCastOf(last.actor);
  }
  updateSyncNote();
  pullPatches(play.slug);
}

// Picking an actor ticks their characters; the ticks can then be changed (double roles, standing in).
function checkCastOf(actor) {
  const mine = play.cast.find((c) => c.actor === actor)?.characters ?? [];
  const names = new Set(mine.map(normalizeName));
  document.querySelectorAll("#charList input").forEach((box) => {
    box.checked = names.has(normalizeName(box.value));
  });
}

function checkedCharacters() {
  return [...document.querySelectorAll("#charList input:checked")].map((box) => box.value);
}

$("actorSelect").addEventListener("change", () => { if (play) checkCastOf($("actorSelect").value); });

// Speech synthesis
let synth = window.speechSynthesis;

// Voice selection
let selectedVoice = null;

function loadVoices() {
  const voices = synth.getVoices();
  const esVoices = voices.filter(v => v.lang.startsWith('es'));
  const preferred = [
    ...esVoices.filter(v => v.lang === 'es-ES'),
    ...esVoices.filter(v => v.lang !== 'es-ES'),
  ];
  if (preferred.length === 0) {
    $('voiceSelect').innerHTML = '<option value="">Sin voces en español</option>';
    return;
  }
  const sel = $('voiceSelect');
  sel.innerHTML = preferred.map((v, i) =>
    `<option value="${i}">${v.name} (${v.lang})</option>`
  ).join('');
  const monicaIdx = preferred.findIndex(v => v.name === 'Mónica');
  sel.selectedIndex = monicaIdx >= 0 ? monicaIdx : 0;
  selectedVoice = preferred[sel.selectedIndex];
  sel.addEventListener('change', function() {
    selectedVoice = preferred[parseInt(this.value)] || null;
  });
}

if (synth.onvoiceschanged !== undefined) {
  synth.onvoiceschanged = loadVoices;
}
setTimeout(loadVoices, 300);

// State
let currentIdx = 0;
let isPaused = false;
let pauseSecs = 8;
let speechRate = 1;
let countdownTimer = null;
let countdownRemaining = 0;
let lineRevealed = false;
let audioCtx = null;
let utteranceGen = 0;
let isRunning = false;

// Setup controls
$('pauseSecs').addEventListener('input', function() {
  pauseSecs = parseInt(this.value);
  $('pauseLabel').textContent = this.value + 's';
});

function startSession() {
  if (!play) { alert('El guion aún no se ha cargado.'); return; }
  const actorVal = $('actorSelect').value;
  const chosen = checkedCharacters();
  if (chosen.length === 0) { alert('Elige tu nombre o marca al menos un personaje.'); return; }
  myChars = charactersOfNames(play, chosen);
  author = actorVal;
  saveLast({ play: play.slug, actor: actorVal });
  $('subtitle').textContent = 'Apuntador Mañanettis · ' + selectionLabel(actorVal, chosen);
  pauseSecs = parseInt($('pauseSecs').value);
  speechRate = parseFloat($('rateSelect').value);
  currentIdx = Math.max(0, SCRIPT.findIndex((l) => l.id === $('startFrom').value));

  $('setup').style.display = 'none';
  $('player').style.display = 'flex';
  renderScriptList();
  playFromCurrent();
}

function isMyLine(line) { return isMyLineOf(line, myChars); }

const cut = (t, n) => escapeHtml(t.length > n ? t.substring(0, n) + '…' : t);

function renderScriptList() {
  const el = $('scriptList');
  el.innerHTML = SCRIPT.map((l, i) => {
    const fixed = l.patches ? ' is-corrected' : '';
    if (l.scene) return `<div class="sl-item${fixed}" id="sl${i}" onclick="jumpTo(${i})" style="color:var(--text-muted);font-style:italic">— ${escapeHtml(l.t)} —</div>`;
    if (l.acot) return `<div class="sl-item${fixed}" id="sl${i}" onclick="jumpTo(${i})" style="color:var(--text-muted);font-size:11px;font-style:italic">${cut(l.t, 60)}</div>`;
    const mine = isMyLine(l);
    return `<div class="sl-item${mine?' is-mine':''}${fixed}" id="sl${i}" onclick="jumpTo(${i})"><span class="sl-speaker">${escapeHtml(l.s)}</span>${cut(l.t, 55)}</div>`;
  }).join('');
  updateSyncNote();
}

function updateDisplay() {
  if (currentIdx >= SCRIPT.length) {
    $('mainDisplay').innerHTML = `<div class="finished-screen"><h2>¡Ensayo completado!</h2><p>Has repasado todo el guion.</p></div>`;
    $('statusZone').innerHTML = '';
    setStatus('');
    return;
  }
  const l = SCRIPT[currentIdx];
  const mine = isMyLine(l);
  const total = SCRIPT.length;

  $('progressFill').style.width = ((currentIdx+1)/total*100).toFixed(1)+'%';
  $('lineCount').textContent = `${currentIdx+1} / ${total}`;

  const card = $('lineCard');
  const sp = $('speakerName');
  const tx = $('lineText');

  if (l.scene) {
    card.className = 'line-card';
    sp.className = 'speaker-name other';
    sp.textContent = '';
    tx.innerHTML = `<span style="font-family:'Playfair Display',serif;font-size:20px;color:var(--gold);font-style:italic">${escapeHtml(l.t)}</span>`;
  } else if (l.acot) {
    card.className = 'line-card';
    sp.className = 'speaker-name other';
    sp.textContent = 'Acotación';
    tx.innerHTML = `<span class="stage-dir">${escapeHtml(l.t)}</span>`;
  } else {
    card.className = 'line-card' + (mine ? ' is-mine' : '');
    sp.className = 'speaker-name ' + (mine ? 'mine' : 'other');
    sp.textContent = l.s;
    if (mine && !lineRevealed) {
      tx.innerHTML = '<div class="line-hidden-wrap" onclick="revealLine()"><span class="line-hidden-label">👁 Toca para ver tu línea</span></div>';
    } else {
      tx.textContent = l.t;
    }
  }
  if (l.patches) sp.insertAdjacentHTML('beforeend', '<span class="corrected-badge">✎ corregida</span>');

  // Update list
  document.querySelectorAll('[id^=sl]').forEach((el, i) => {
    el.classList.toggle('active', i === currentIdx);
    if (i === currentIdx) el.scrollIntoView({block:'nearest', behavior:'smooth'});
  });
}

function setStatus(type, extra) {
  const z = $('statusZone');
  if (!type) { z.innerHTML = ''; return; }
  if (type === 'reading') {
    z.innerHTML = `<div class="status-pill reading"><span class="dot"></span> Leyendo...</div>`;
  } else if (type === 'myturn') {
    const pct = Math.round((extra / pauseSecs) * 100);
    z.innerHTML = `<div class="status-pill your-turn">🎭 Tu turno — di tu línea — ${extra}s</div><div class="countdown-bar"><div class="countdown-fill" id="cdf" style="width:${pct}%"></div></div>`;
  } else if (type === 'paused') {
    z.innerHTML = `<div class="status-pill paused">⏸ Pausado</div>`;
  }
}

function playBeep() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.4);
}

function revealLine() {
  lineRevealed = true;
  $('lineText').textContent = SCRIPT[currentIdx].t;
}

function playFromCurrent() {
  if (currentIdx >= SCRIPT.length) { updateDisplay(); return; }
  lineRevealed = false;
  isRunning = true;
  isPaused = false;
  $('playBtn').textContent = '⏸ Pausar';
  updateDisplay();

  const l = SCRIPT[currentIdx];
  if (isSkippable(l)) {
    // Show briefly then move on
    setTimeout(() => { if (!isPaused && isRunning) { currentIdx++; playFromCurrent(); } }, 800);
    return;
  }
  if (isMyLine(l)) {
    startMyLinePause();
  } else {
    speakLine(l.t, () => { if (!isPaused && isRunning) { currentIdx++; playFromCurrent(); } });
  }
}

function startMyLinePause() {
  playBeep();
  countdownRemaining = pauseSecs;
  setStatus('myturn', countdownRemaining);
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    countdownRemaining--;
    const el = $('cdf');
    if (el) el.style.width = Math.round((countdownRemaining/pauseSecs)*100)+'%';
    setStatus('myturn', countdownRemaining);
    if (countdownRemaining <= 0) {
      clearInterval(countdownTimer);
      setStatus('');
      if (!isPaused && isRunning) { currentIdx++; playFromCurrent(); }
    }
  }, 1000);
}

function speakLine(text, onEnd) {
  synth.cancel();
  setStatus('reading');
  const myGen = utteranceGen;
  setTimeout(() => {
    if (utteranceGen !== myGen) return;
    const utt = new SpeechSynthesisUtterance(stripParens(text));
    const voiceName = $('voiceSelect').selectedOptions[0]?.text;
    const freshVoice = synth.getVoices().find(v => v.name === voiceName?.split(' (')[0]);
    if (freshVoice) { utt.voice = freshVoice; utt.lang = freshVoice.lang; }
    else if (selectedVoice) { utt.voice = selectedVoice; utt.lang = selectedVoice.lang; }
    else { utt.lang = 'es-ES'; }
    utt.rate = speechRate;
    utt.onend = () => { if (utteranceGen === myGen) { setStatus(''); onEnd(); } };
    utt.onerror = () => { if (utteranceGen === myGen) { setStatus(''); onEnd(); } };
    synth.speak(utt);
  }, 150);
}

function stopAll() {
  utteranceGen++;
  clearInterval(countdownTimer);
  synth.cancel();
  setStatus('');
  isRunning = false;
}

function togglePlay() {
  if (isPaused) {
    isPaused = false;
    $('playBtn').textContent = '⏸ Pausar';
    playFromCurrent();
  } else {
    isPaused = true;
    utteranceGen++;
    clearInterval(countdownTimer);
    synth.pause();
    isRunning = false;
    $('playBtn').textContent = '▶ Continuar';
    setStatus('paused');
  }
}

function cooldownNav() {
  document.querySelectorAll('button[data-nav]').forEach(b => { b.disabled = true; });
  setTimeout(() => { document.querySelectorAll('button[data-nav]').forEach(b => { b.disabled = false; }); }, 500);
}

function restartScene() {
  cooldownNav(); stopAll();
  currentIdx = findSceneStart(SCRIPT, currentIdx);
  playFromCurrent();
}

function nextScene() {
  cooldownNav(); stopAll();
  const i = nextSceneIdx(SCRIPT, currentIdx);
  if (i >= 0) { currentIdx = i; playFromCurrent(); }
}

function prevScene() {
  cooldownNav(); stopAll();
  currentIdx = prevSceneIdx(SCRIPT, currentIdx);
  playFromCurrent();
}

function nextLine() {
  cooldownNav(); stopAll();
  currentIdx = nextLineIdx(SCRIPT, currentIdx);
  playFromCurrent();
}
function prevLine() {
  cooldownNav(); stopAll();
  currentIdx = prevLineIdx(SCRIPT, currentIdx);
  playFromCurrent();
}
function repeatLine() { cooldownNav(); stopAll(); playFromCurrent(); }
function jumpTo(i) { stopAll(); currentIdx = i; playFromCurrent(); }
function goSetup() {
  stopAll();
  $('player').style.display = 'none';
  $('setup').style.display = 'flex';
}

// Corrections (local for now: localStorage per play)
let editMode = 'edit'; // 'edit' the current line | 'insert' after it

function pausePlayback() {
  if (isPaused) return;
  stopAll();
  isPaused = true;
  $('playBtn').textContent = '▶ Continuar';
  setStatus('paused');
}

function speakerOptions(selected, withStageDir) {
  const names = play.characters.map((c) => c.name);
  if (selected && !names.some((n) => normalizeName(n) === normalizeName(selected))) names.push(selected);
  const opts = names.map((n) =>
    `<option value="${escapeHtml(n)}"${normalizeName(n) === normalizeName(selected) ? ' selected' : ''}>${escapeHtml(n)}</option>`);
  if (withStageDir) opts.unshift(`<option value=""${selected ? '' : ' selected'}>(acotación)</option>`);
  return opts.join('');
}

function openEditor() {
  if (!author) { alert('Para corregir, vuelve al inicio y elige tu nombre en «¿Quién eres?».'); return; }
  const l = SCRIPT[currentIdx];
  if (!l) return;
  pausePlayback();
  editMode = 'edit';
  $('editTitle').textContent = 'Corregir línea';
  $('editSpeakerField').style.display = l.scene ? 'none' : '';
  // A spoken line can change speaker but not become a stage direction; a stage direction can get a speaker.
  $('editSpeaker').innerHTML = speakerOptions(l.acot ? '' : l.s, Boolean(l.acot));
  $('editText').value = l.t;
  $('editLineActions').style.display = '';
  $('undoLineBtn').disabled = !l.patches;
  $('editDialog').showModal();
}

function insertAfterCurrent() {
  const l = SCRIPT[currentIdx];
  editMode = 'insert';
  $('editTitle').textContent = 'Añadir línea después';
  $('editSpeakerField').style.display = '';
  $('editSpeaker').innerHTML = speakerOptions(isSkippable(l) ? '' : l.s, true);
  $('editText').value = '';
  $('editLineActions').style.display = 'none';
  $('editText').focus();
}

function closeEditor() { $('editDialog').close(); }

const patchCtx = () => ({ author, deviceId: deviceId(), now: new Date().toISOString(), uuid });

// Saves new patches and re-applies them, staying on the same line (or on the new one).
function commitPatches(newPatches, focusId) {
  if (newPatches.length === 0) return;
  patches = [...patches, ...newPatches.map((p) => ({ ...p, pending: true }))];
  savePatches();
  refreshScript(focusId);
  pushPending();
}

function refreshScript(focusId) {
  const currentId = focusId ?? SCRIPT[currentIdx]?.id;
  SCRIPT = applyPatches(play.lines, patches);
  const i = SCRIPT.findIndex((l) => l.id === currentId);
  currentIdx = i >= 0 ? i : Math.min(currentIdx, SCRIPT.length - 1);
  renderScriptList();
  updateDisplay();
}

function saveEditor() {
  const l = SCRIPT[currentIdx];
  const speaker = $('editSpeakerField').style.display === 'none' ? '' : $('editSpeaker').value;
  const text = $('editText').value;
  if (editMode === 'insert') {
    if (!text.trim()) { alert('Escribe el texto de la línea.'); return; }
    const p = newPatch({ op: 'insert', afterId: l.id, ...(speaker ? { speaker } : {}), text: text.trim() }, patchCtx());
    commitPatches([p], p.lineId);
  } else {
    commitPatches(patchesFromEdit(l, { speaker, text }, patchCtx()));
  }
  closeEditor();
}

function deleteCurrentLine() {
  const l = SCRIPT[currentIdx];
  if (!confirm(`¿Borrar esta línea?\n\n${l.s ? l.s + ': ' : ''}${l.t}`)) return;
  commitPatches([newPatch({ op: 'delete', lineId: l.id }, patchCtx())]);
  closeEditor();
}

function undo(id) {
  patches = markUndo(patches, id);
  savePatches();
  refreshScript();
  pushPending();
}

function redo(id) {
  patches = markRedo(patches, id);
  savePatches();
  refreshScript();
  pushPending();
}

// Undoes the latest correction of the current line.
function undoCurrentLine() {
  const ids = SCRIPT[currentIdx]?.patches;
  if (!ids) return;
  undo(ids[ids.length - 1]);
  closeEditor();
}

function openCorrections() {
  pausePlayback();
  renderCorrections();
  $('patchesDialog').showModal();
  pullPatches(play.slug); // see the latest from the rest of the class
}

function renderCorrections() {
  const active = activePatches(patches).slice().reverse(); // newest first
  const undoneOnes = patches.filter((p) => p.undone).reverse();
  // Corrections to added lines quote the added text (the base play doesn't have it).
  const added = patches.filter((p) => p.op === 'insert')
    .map((p) => (p.speaker ? { id: p.lineId, s: p.speaker, t: p.text } : { id: p.lineId, t: p.text, acot: true }));
  const known = [...play.lines, ...added];
  const item = (p, button) => `<div class="patch-item${p.undone ? ' is-undone' : ''}"><div>${escapeHtml(describePatch(p, known))}
        <div class="patch-meta">${escapeHtml(p.author ?? '')} · ${new Date(p.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</div></div>
        ${button}</div>`;
  const activeHtml = active.length === 0
    ? '<p class="patch-empty">Aún no hay correcciones en esta obra.</p>'
    : active.map((p) => item(p, `<button class="btn" onclick="undoFromList('${escapeHtml(p.id)}')">↶ Deshacer</button>`)).join('');
  const undoneHtml = undoneOnes.length === 0 ? '' : '<div class="patch-section">Deshechas</div>' +
    undoneOnes.map((p) => item(p, `<button class="btn" onclick="redoFromList('${escapeHtml(p.id)}')">↷ Rehacer</button>`)).join('');
  $('patchList').innerHTML = activeHtml + undoneHtml;
}

function undoFromList(id) {
  if (!author) { alert('Para deshacer, vuelve al inicio y elige tu nombre en «¿Quién eres?».'); return; }
  undo(id);
  renderCorrections();
}

function redoFromList(id) {
  if (!author) { alert('Para rehacer, vuelve al inicio y elige tu nombre en «¿Quién eres?».'); return; }
  redo(id);
  renderCorrections();
}

// Modules don't leak to window: expose what the inline onclick handlers call.
Object.assign(window, {
  startSession, togglePlay, revealLine, restartScene, nextScene, prevScene,
  nextLine, prevLine, repeatLine, jumpTo, goSetup,
  openEditor, closeEditor, saveEditor, insertAfterCurrent, deleteCurrentLine, undoCurrentLine,
  openCorrections, undoFromList, redoFromList,
});

loadIndex();
