'use strict';
const $ = (s) => document.querySelector(s);

let GAMES = {};
let selected = null;
let signedIn = false;
let busy = false;

function renderCards() {
  const wrap = $('#cards');
  wrap.innerHTML = '';
  for (const g of Object.values(GAMES)) {
    const el = document.createElement('div');
    el.className = 'card';
    el.style.setProperty('--sel', g.accent);
    el.dataset.id = g.id;
    el.innerHTML = `
      <div class="title"><span class="swatch" style="background:${g.accent}"></span>${g.name}</div>
      <div class="blurb">${g.blurb}</div>
      <div class="meta">Minecraft 1.21.1 · Fabric · ${g.server}</div>`;
    el.addEventListener('click', () => selectGame(g.id));
    wrap.appendChild(el);
  }
}

function selectGame(id) {
  selected = id;
  document.querySelectorAll('.card').forEach((c) => c.classList.toggle('selected', c.dataset.id === id));
  $('#server').placeholder = GAMES[id].server;
  updatePlay();
}

function updatePlay() {
  const btn = $('#play');
  if (!selected) { btn.textContent = 'Select a game'; btn.disabled = true; return; }
  if (!signedIn) { btn.textContent = 'Sign in to play'; btn.disabled = true; return; }
  if (busy) { btn.disabled = true; return; }
  btn.textContent = `Play ${GAMES[selected].name}`;
  btn.disabled = false;
}

function setSignedIn(p) {
  signedIn = !!p;
  $('#signin').classList.toggle('hidden', signedIn);
  $('#whoami').classList.toggle('hidden', !signedIn);
  if (p) $('#username').textContent = p.name;
  updatePlay();
}

function showProgress(on) {
  $('#progress').classList.toggle('hidden', !on);
  $('#log').classList.toggle('hidden', !on);
}

async function init() {
  GAMES = await window.norfbay.games();
  renderCards();

  window.norfbay.onLog((m) => {
    const log = $('#log');
    log.textContent += m.replace(/\s+$/, '') + '\n';
    log.scrollTop = log.scrollHeight;
  });
  window.norfbay.onPhase((p) => {
    $('#phase').textContent = p.text;
    if (typeof p.pct === 'number') $('#fill').style.width = Math.max(0, Math.min(100, p.pct)) + '%';
  });

  $('#signin').addEventListener('click', async () => {
    try { setSignedIn(await window.norfbay.login()); }
    catch (e) { alert('Sign-in failed: ' + (e.message || e)); }
  });
  $('#signout').addEventListener('click', async () => { await window.norfbay.logout(); setSignedIn(null); });

  $('#play').addEventListener('click', async () => {
    if (!selected || busy) return;
    busy = true; updatePlay(); showProgress(true);
    $('#fill').style.width = '0%';
    try {
      await window.norfbay.play({
        gameId: selected,
        server: $('#server').value,
        memoryMb: Number($('#memory').value),
      });
    } catch (e) {
      $('#phase').textContent = 'Error: ' + (e.message || e);
    } finally {
      busy = false; updatePlay();
    }
  });

  // restore a previous session if the refresh token is still good
  try { setSignedIn(await window.norfbay.authStatus()); } catch {}
}

init();
