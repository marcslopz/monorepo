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
} from "./lib.js";

const INDEX_URL = "plays/index.json";
const LAST_KEY = "mananettis:last"; // { play, actor } of the previous session, per browser

let play = null;
let SCRIPT = [];
let myChars = new Set();

const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function readLast() {
  try { return JSON.parse(localStorage.getItem(LAST_KEY)) ?? {}; } catch { return {}; }
}
function saveLast(last) {
  try { localStorage.setItem(LAST_KEY, JSON.stringify(last)); } catch { /* private mode */ }
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
  SCRIPT = play.lines;
  $("subtitle").textContent = "Apuntador Mañanettis";
  document.querySelectorAll(".play-title").forEach((el) => { el.textContent = play.title; });
  $("actorSelect").innerHTML =
    '<option value="">— Selecciona tu nombre —</option>' +
    play.cast.map((c) => `<option value="${escapeHtml(c.actor)}">${escapeHtml(actorLabel(c))}</option>`).join("");
  $("charList").innerHTML = speakingCharacters(play)
    .map((name) => `<label class="char-chip"><input type="checkbox" value="${escapeHtml(name)}">${escapeHtml(name)}</label>`)
    .join("");
  $("startFrom").innerHTML =
    '<option value="0">Desde el principio</option>' +
    sceneStarts(SCRIPT).map((s) => `<option value="${s.idx}">${escapeHtml(s.title)}</option>`).join("");

  const last = readLast();
  if (last.play === play.slug && play.cast.some((c) => c.actor === last.actor)) {
    $("actorSelect").value = last.actor;
    checkCastOf(last.actor);
  }
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
  saveLast({ play: play.slug, actor: actorVal });
  $('subtitle').textContent = 'Apuntador Mañanettis · ' + selectionLabel(actorVal, chosen);
  pauseSecs = parseInt($('pauseSecs').value);
  speechRate = parseFloat($('rateSelect').value);
  currentIdx = parseInt($('startFrom').value) || 0;

  $('setup').style.display = 'none';
  $('player').style.display = 'flex';
  renderScriptList();
  playFromCurrent();
}

function isMyLine(line) { return isMyLineOf(line, myChars); }

function renderScriptList() {
  const el = $('scriptList');
  el.innerHTML = SCRIPT.map((l, i) => {
    if (l.scene) return `<div class="sl-item" id="sl${i}" onclick="jumpTo(${i})" style="color:var(--text-muted);font-style:italic">— ${l.t} —</div>`;
    if (l.acot) return `<div class="sl-item" id="sl${i}" onclick="jumpTo(${i})" style="color:var(--text-muted);font-size:11px;font-style:italic">${l.t.substring(0,60)}${l.t.length>60?'…':''}</div>`;
    const mine = isMyLine(l);
    return `<div class="sl-item${mine?' is-mine':''}" id="sl${i}" onclick="jumpTo(${i})"><span class="sl-speaker">${l.s}</span>${l.t.substring(0,55)}${l.t.length>55?'…':''}</div>`;
  }).join('');
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
    tx.innerHTML = `<span style="font-family:'Playfair Display',serif;font-size:20px;color:var(--gold);font-style:italic">${l.t}</span>`;
  } else if (l.acot) {
    card.className = 'line-card';
    sp.className = 'speaker-name other';
    sp.textContent = 'Acotación';
    tx.innerHTML = `<span class="stage-dir">${l.t}</span>`;
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

// Modules don't leak to window: expose what the inline onclick handlers call.
Object.assign(window, {
  startSession, togglePlay, revealLine, restartScene, nextScene, prevScene,
  nextLine, prevLine, repeatLine, jumpTo, goSetup,
});

loadIndex();
