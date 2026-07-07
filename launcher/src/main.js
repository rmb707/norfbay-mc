// main.js — Electron main process for the Norfbay launcher.
// Flow: sign in (Microsoft) -> install Java + modpack + Fabric -> launch into the server.
'use strict';

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { Client } = require('minecraft-launcher-core');
const { Auth } = require('msmc');
const { MINECRAFT_VERSION, GAMES, REMOTE_CONFIG_URL } = require('./config');
const { ensureJava, ensureFabric, installModpack } = require('./installer');

// Resolve server addresses from the hosted config (so they can change without a
// new .exe), falling back to the baked-in defaults if the fetch fails.
let resolvedGames = null;
async function resolveGames() {
  const games = JSON.parse(JSON.stringify(GAMES));
  try {
    const r = await fetch(REMOTE_CONFIG_URL, { cache: 'no-store' });
    if (r.ok) {
      const remote = await r.json();
      for (const id of Object.keys(games)) {
        if (remote[id] && typeof remote[id].server === 'string') games[id].server = remote[id].server;
      }
    }
  } catch { /* offline / unreachable -> use baked-in addresses */ }
  resolvedGames = games;
  return games;
}

const isPackaged = app.isPackaged;
const ASSETS = isPackaged ? path.join(process.resourcesPath, 'assets') : path.join(__dirname, '..', 'assets');
const AUTH_FILE = () => path.join(app.getPath('userData'), 'auth.json');
const instanceRoot = (gameId) => path.join(app.getPath('userData'), 'instances', gameId);

let win = null;
let authManager = new Auth('select');
let xbox = null;       // active Xbox manager (holds MC token)
let profile = null;    // { name, uuid }

function send(channel, payload) { if (win && !win.isDestroyed()) win.webContents.send(channel, payload); }
const log = (msg) => send('log', String(msg));

function createWindow() {
  win = new BrowserWindow({
    width: 940,
    height: 640,
    minWidth: 820,
    minHeight: 560,
    backgroundColor: '#0e0f13',
    title: 'Norfbay',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

// ---- auth ----
async function tryRestoreLogin() {
  try {
    const saved = JSON.parse(fs.readFileSync(AUTH_FILE(), 'utf8'));
    if (!saved || !saved.refresh) return null;
    xbox = await authManager.refresh(saved.refresh);
    const mc = await xbox.getMinecraft();
    profile = { name: mc.profile.name, uuid: mc.profile.id };
    return profile;
  } catch { return null; }
}

async function interactiveLogin() {
  xbox = await authManager.launch('electron'); // opens the Microsoft login window
  const mc = await xbox.getMinecraft();
  profile = { name: mc.profile.name, uuid: mc.profile.id };
  try {
    const refresh = xbox.save ? xbox.save() : (xbox.msToken && xbox.msToken.refresh_token);
    if (refresh) fs.writeFileSync(AUTH_FILE(), JSON.stringify({ refresh }));
  } catch (e) { /* persistence is best-effort */ }
  return profile;
}

ipcMain.handle('auth:status', async () => profile || (await tryRestoreLogin()));
ipcMain.handle('auth:login', async () => interactiveLogin());
ipcMain.handle('auth:logout', async () => {
  profile = null; xbox = null;
  try { fs.unlinkSync(AUTH_FILE()); } catch {}
  return true;
});
ipcMain.handle('games', async () => resolveGames());

// ---- play ----
ipcMain.handle('play', async (_e, { gameId, server, memoryMb }) => {
  const games = resolvedGames || (await resolveGames());
  const game = games[gameId];
  if (!game) throw new Error(`Unknown game ${gameId}`);
  if (!xbox) { await tryRestoreLogin(); }
  if (!xbox) throw new Error('Not signed in');

  const root = instanceRoot(gameId);
  fs.mkdirSync(root, { recursive: true });
  const address = (server && server.trim()) || game.server;

  send('phase', { text: `Preparing ${game.name}…`, pct: 0 });

  const javaPath = await ensureJava(
    app.getPath('userData'),
    (m) => log(m),
    (stage, p) => {
      if (stage === 'download') send('phase', { text: `Downloading Java 21… ${Math.round(p * 100)}%`, pct: Math.round(p * 8) });
      else send('phase', { text: `Extracting Java 21… ${Math.round(p * 100)}% (first run is slow — Windows scans each file)`, pct: 8 + Math.round(p * 8) });
    }
  );
  send('phase', { text: 'Installing modpack…', pct: 18 });
  await installModpack(
    root,
    path.join(ASSETS, game.mrpack),
    (m) => log(m),
    (done, total) => send('phase', { text: `Downloading mods (${done}/${total})…`, pct: 18 + Math.round((done / Math.max(total, 1)) * 37) })
  );
  const fabricVersion = await ensureFabric(root, MINECRAFT_VERSION, (m) => log(m));

  send('phase', { text: `Launching Minecraft ${MINECRAFT_VERSION} — joining ${address}…`, pct: 60 });
  const mc = await xbox.getMinecraft();
  const launcher = new Client();
  launcher.on('debug', (l) => log(l));
  launcher.on('data', (l) => log(l));
  launcher.on('progress', (e) => {
    if (e && e.type) send('phase', { text: `Downloading ${e.type} (${e.task}/${e.total})…`, pct: 60 + Math.min(35, Math.round((e.task / Math.max(e.total, 1)) * 35)) });
  });

  await launcher.launch({
    authorization: mc.mclc(),
    root,
    version: { number: MINECRAFT_VERSION, type: 'release', custom: fabricVersion },
    memory: { max: `${memoryMb || 4096}M`, min: '1024M' },
    javaPath,
    // Force IPv4: some players' networks have a broken IPv6 path (SYN/ACK completes,
    // but any real data after it silently vanishes -- a PMTU/ICMPv6 blackhole). Java
    // otherwise follows the OS's address-selection order, which on Windows often
    // prefers IPv6 whenever an AAAA record exists, even if that path is broken.
    customArgs: ['-Djava.net.preferIPv4Stack=true'],
    customLaunchArgs: ['--quickPlayMultiplayer', address],
    overrides: { maxSockets: 4 },
  });

  send('phase', { text: 'Minecraft is running — see you in-game!', pct: 100 });
  return { launched: true, address };
});

// ---- app lifecycle ----
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
