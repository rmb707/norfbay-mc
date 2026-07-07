// build-mrpack.mjs — single source of truth -> client .mrpack + server mod list.
//
// Reads modpacks/<game>.pack.json and resolves each mod's current file from the
// public Modrinth API (no auth). Emits:
//   dist/norfbay-<game>.mrpack        (client pack: Modrinth App / Prism / the launcher)
//   dist/<game>.server-mods.txt       (comma list for docker-compose MODRINTH_PROJECTS)
//
// Modes:
//   (default)  interim  -> only mods marked "deployed": true (matches the live servers today)
//   --full              -> the full curated "epic" pack (all client+both mods)
//
// Usage:  node build-mrpack.mjs [--full] [game ...]
//         node build-mrpack.mjs cobblemon
//
// Requires: Node 18+ (global fetch) and `npm install` in this folder (adm-zip).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist');
const UA = 'norfbay-mc/0.1 (github.com/norfbay; robseris@gmail.com)';
const ALLOWED_TYPES = ['release', 'beta'];

const argv = process.argv.slice(2);
const FULL = argv.includes('--full');
const games = argv.filter((a) => !a.startsWith('--'));
const targets = games.length ? games : ['cobblemon', 'vanilla'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.status === 429) { await sleep(2000 * (i + 1)); continue; }
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
    return r.json();
  }
  throw new Error(`rate-limited: ${url}`);
}

async function latestFabricLoader() {
  const arr = await api('https://meta.fabricmc.net/v2/versions/loader');
  return (arr.find((x) => x.stable) || arr[0]).version;
}

async function resolveVersion(idOrSlug, mc, loader) {
  const q =
    `https://api.modrinth.com/v2/project/${idOrSlug}/version` +
    `?loaders=${encodeURIComponent(JSON.stringify([loader]))}` +
    `&game_versions=${encodeURIComponent(JSON.stringify([mc]))}`;
  const versions = await api(q);
  if (!versions || !versions.length) return null;
  const ok = versions
    .filter((v) => ALLOWED_TYPES.includes(v.version_type))
    .sort((a, b) => new Date(b.date_published) - new Date(a.date_published));
  return ok[0] || null;
}

const primaryFile = (v) => v.files.find((f) => f.primary) || v.files[0];

async function build(game) {
  const packPath = path.join(ROOT, 'modpacks', `${game}.pack.json`);
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  const mc = pack.minecraft, loader = pack.loader;
  const inScope = (m) => (FULL ? m.side !== 'server' : m.deployed && m.side !== 'server');

  console.log(`\n=== ${game}  (${FULL ? 'FULL' : 'interim'} · ${mc}/${loader}) ===`);

  const clientMods = pack.mods.filter(inScope);
  const files = [];
  const seen = new Set();       // ids/slugs already dequeued
  const seenProj = new Set();   // canonical Modrinth project ids already added (dedupe slug-vs-id)
  const missingReq = [];
  const skipped = [];
  const queue = clientMods.map((m) => ({ id: m.slug, required: !!m.required }));

  while (queue.length) {
    const { id, required } = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    let v = null;
    try { v = await resolveVersion(id, mc, loader); } catch (e) { console.warn(`  ! ${id}: ${e.message}`); }
    if (!v) { (required ? missingReq : skipped).push(id); if (!required) console.warn(`  - skip (no ${mc} ${loader} build): ${id}`); continue; }
    if (seenProj.has(v.project_id)) continue;  // already added under a different id/slug
    seenProj.add(v.project_id);
    const f = primaryFile(v);
    files.push({
      path: `mods/${f.filename}`,
      hashes: { sha1: f.hashes.sha1, sha512: f.hashes.sha512 },
      env: { client: 'required', server: 'optional' },
      downloads: [f.url],
      fileSize: f.size,
    });
    console.log(`  + ${id} -> ${f.filename}`);
    for (const d of v.dependencies || []) {
      if (d.dependency_type === 'required' && d.project_id && !seen.has(d.project_id)) {
        queue.push({ id: d.project_id, required: true });
      }
    }
    await sleep(120); // be polite to the API
  }

  if (missingReq.length) throw new Error(`Required mods with no ${mc} ${loader} build: ${missingReq.join(', ')}`);

  const loaderVersion = await latestFabricLoader();
  const index = {
    formatVersion: 1,
    game: 'minecraft',
    versionId: pack.version || '0.1.0',
    name: pack.name + (FULL ? '' : ' (interim)'),
    summary: pack.summary,
    files,
    dependencies: { minecraft: mc, 'fabric-loader': loaderVersion },
  };

  fs.mkdirSync(OUT, { recursive: true });
  const zip = new AdmZip();
  zip.addFile('modrinth.index.json', Buffer.from(JSON.stringify(index, null, 2)));
  const mrpack = path.join(OUT, `norfbay-${game}.mrpack`);
  zip.writeZip(mrpack);

  // server-side list for docker-compose MODRINTH_PROJECTS
  const serverMods = pack.mods
    .filter((m) => (m.side === 'server' || m.side === 'both') && (FULL ? true : m.deployed))
    .map((m) => m.slug);
  fs.writeFileSync(path.join(OUT, `${game}.server-mods.txt`), serverMods.join(',\n') + '\n');

  console.log(`  => ${path.relative(ROOT, mrpack)}  (${files.length} mods, loader ${loaderVersion})`);
  if (skipped.length) console.log(`  => skipped optional: ${skipped.join(', ')}`);
  console.log(`  => server MODRINTH_PROJECTS: ${serverMods.join(', ')}`);
}

for (const g of targets) await build(g);
console.log('\nDone.');
