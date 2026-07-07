// preload.js — safe bridge between the renderer UI and the main process.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('norfbay', {
  games: () => ipcRenderer.invoke('games'),
  authStatus: () => ipcRenderer.invoke('auth:status'),
  login: () => ipcRenderer.invoke('auth:login'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  play: (opts) => ipcRenderer.invoke('play', opts),
  onLog: (cb) => ipcRenderer.on('log', (_e, m) => cb(m)),
  onPhase: (cb) => ipcRenderer.on('phase', (_e, p) => cb(p)),
});
