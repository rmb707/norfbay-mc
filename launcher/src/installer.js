// installer.js — everything the launcher needs on disk before it can play:
//   ensureJava     -> a Java 21 runtime (downloads Adoptium Temurin if absent)
//   ensureFabric   -> writes the Fabric loader profile for the MC version
//   installModpack -> reads an embedded .mrpack and downloads/verifies its mods
'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const AdmZip = require('adm-zip');
const extract = require('extract-zip');
const { JAVA } = require('./config');

async function sha1File(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha1');
    fs.createReadStream(file)
      .on('data', (d) => h.update(d))
      .on('end', () => resolve(h.digest('hex')))
      .on('error', reject);
  });
}

// Download url -> dest with progress callback (0..1 when length known, else -1).
async function download(url, dest, onProgress) {
  const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'norfbay-launcher/0.1' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  const total = Number(res.headers.get('content-length')) || 0;
  let seen = 0;
  const nodeStream = Readable.fromWeb(res.body);
  const out = fs.createWriteStream(dest);
  await new Promise((resolve, reject) => {
    nodeStream.on('data', (c) => {
      seen += c.length;
      if (onProgress) onProgress(total ? seen / total : -1, seen, total);
    });
    nodeStream.on('error', reject);
    out.on('error', reject);
    out.on('finish', resolve);
    nodeStream.pipe(out);
  });
}

function findJavaw(dir) {
  // Temurin zip extracts to a top folder like jdk-21.0.x+y-jre/bin/javaw.exe
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name.toLowerCase() === 'javaw.exe') return p;
    }
  }
  return null;
}

async function ensureJava(baseDir, log) {
  const javaDir = path.join(baseDir, 'runtime', 'temurin21');
  const existing = findJavaw(javaDir);
  if (existing) { log(`Java 21 ready.`); return existing; }

  log(`Downloading Java ${JAVA.major} runtime…`);
  await fsp.mkdir(javaDir, { recursive: true });
  const zip = path.join(baseDir, 'runtime', 'temurin21.zip');
  await download(JAVA.url, zip, (p) => log(`Java ${JAVA.major}: ${p >= 0 ? Math.round(p * 100) + '%' : '…'}`, true));
  log(`Extracting Java runtime…`);
  await extract(zip, { dir: javaDir });
  await fsp.rm(zip, { force: true });
  const javaw = findJavaw(javaDir);
  if (!javaw) throw new Error('Java runtime extracted but javaw.exe not found');
  log(`Java 21 ready.`);
  return javaw;
}

async function ensureFabric(root, mc, log) {
  log(`Resolving Fabric loader for ${mc}…`);
  const list = await (await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mc}`)).json();
  if (!Array.isArray(list) || !list.length) throw new Error(`No Fabric loader for ${mc}`);
  const loaderVersion = list[0].loader.version;
  const versionId = `fabric-loader-${loaderVersion}-${mc}`;
  const jsonPath = path.join(root, 'versions', versionId, `${versionId}.json`);
  if (!fs.existsSync(jsonPath)) {
    const profile = await (
      await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mc}/${loaderVersion}/profile/json`)
    ).json();
    await fsp.mkdir(path.dirname(jsonPath), { recursive: true });
    await fsp.writeFile(jsonPath, JSON.stringify(profile));
  }
  log(`Fabric ${loaderVersion} ready.`);
  return versionId;
}

async function installModpack(root, mrpackPath, log, onProgress) {
  log(`Reading modpack…`);
  const zip = new AdmZip(mrpackPath);
  const indexEntry = zip.getEntry('modrinth.index.json');
  if (!indexEntry) throw new Error('modrinth.index.json missing from mrpack');
  const index = JSON.parse(zip.readAsText(indexEntry));
  const files = index.files || [];

  // Track what we manage so a re-install can prune removed mods.
  const managedPath = path.join(root, '.norfbay-managed.json');
  let prevManaged = [];
  try { prevManaged = JSON.parse(fs.readFileSync(managedPath, 'utf8')); } catch {}

  const nowManaged = [];
  let done = 0;
  for (const f of files) {
    const dest = path.join(root, f.path);
    nowManaged.push(f.path);
    const want = f.hashes && f.hashes.sha1;
    let ok = false;
    if (fs.existsSync(dest) && want) {
      try { ok = (await sha1File(dest)) === want; } catch { ok = false; }
    }
    if (!ok) {
      log(`Downloading ${path.basename(f.path)}…`);
      await download(f.downloads[0], dest, (p) => onProgress(done, files.length, p));
      if (want) {
        const got = await sha1File(dest);
        if (got !== want) throw new Error(`Hash mismatch for ${f.path}`);
      }
    }
    done++;
    onProgress(done, files.length, 1);
  }

  // Apply overrides/ (client configs bundled in the pack), if any.
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.replace(/\\/g, '/');
    if (name.startsWith('overrides/')) {
      const rel = name.slice('overrides/'.length);
      const dest = path.join(root, rel);
      await fsp.mkdir(path.dirname(dest), { recursive: true });
      await fsp.writeFile(dest, entry.getData());
    }
  }

  // Prune mods we previously installed that aren't in this pack anymore.
  for (const p of prevManaged) {
    if (!nowManaged.includes(p)) {
      try { await fsp.rm(path.join(root, p), { force: true }); } catch {}
    }
  }
  await fsp.writeFile(managedPath, JSON.stringify(nowManaged, null, 2));
  log(`Modpack ready (${files.length} mods).`);
}

module.exports = { ensureJava, ensureFabric, installModpack };
