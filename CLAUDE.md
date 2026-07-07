# Norfbay Minecraft — agent handoff

You're picking up a project mid-flight (it was built on another machine that lacked the SSH
key to the deploy box; **this** machine has the key). Read this fully — it's the source of truth.

## ▶ Your task right now: deploy the two servers to the user's Oracle box
Everything is built and in this repo. The servers just need to run on the user's always-on
Oracle Cloud box. The box connection details are **not** in this repo (it's public — see Safety).
Get them from `deploy/TARGET.local` if present, else ask the user for the one-line SSH command
(the private key is already at `~/.ssh/oci_livekit` on this machine).

Then, on the box:
```bash
curl -fsSL https://raw.githubusercontent.com/rmb707/norfbay-mc/main/deploy/oracle-deploy.sh -o oracle-deploy.sh
less oracle-deploy.sh                      # review it
bash oracle-deploy.sh "<MinecraftName>"    # deploys; aborts if unsafe
```
Do a **read-only recon first** (`docker ps`, `free -m`, `ss -tlnH`) so you understand the box
before changing anything. The script itself is idempotent and preflight-guarded.

## ⚠️ SAFETY — the box is PRODUCTION, do not disturb it
It runs the user's real services in Docker (a web app + its database) fronted by a Cloudflare
Tunnel. Hard rules:
- **Never** touch, stop, restart, or reconfigure any container **not** named `norfbay-*`.
- **Do not** modify the Cloudflare Tunnel, iptables, the VCN security list, or open any inbound port.
- The Norfbay stack is an isolated compose project (`norfbay-mc`) with its own network; game +
  RCON bind to **127.0.0.1 only**. Public play is via playit's **outbound** tunnel (no open ports).
- Memory is hard-capped (`docker-compose.oracle.yml`) and the deploy script **aborts** if RAM
  headroom is tight — trust that; don't force it.
- After deploy, confirm the user's other containers are still `Up` and untouched.

## What this project is
- Two Minecraft servers, both **Fabric 1.21.1 / Java 21**:
  - **Cobblemon** (Pokémon) + curated mods
  - **Vanilla+** (performance/QoL)
- Hosted with `itzg/minecraft-server` in Docker (`docker-compose.yml`); server mods auto-download
  via `MODRINTH_PROJECTS`.
- Players use a **custom Windows launcher** (`launcher/`, Electron) that installs Minecraft +
  Fabric + Java 21 + the modpack and launches straight into the server (Microsoft auth via `msmc`,
  install/launch via `minecraft-launcher-core`). Published as **GitHub Release `v0.1.0`**
  (`Norfbay-Setup-0.1.0.exe`, public download).
- The launcher fetches **`servers.json`** at runtime → change the server address with a commit,
  **no new .exe**.

## Repo map
- `docker-compose.yml` — the two servers (+ backup sidecars; profile-gated `playit`/`web`)
- `docker-compose.oracle.yml` — shared-host overlay: per-container `mem_limit`
- `deploy/oracle-deploy.sh` — safe deploy (port/RAM preflight, localhost bind, memory tiers)
- `deploy/TARGET.example` — copy to `deploy/TARGET.local` (gitignored) for box connection info
- `.env.example` — config template; real secrets live in `.env` (gitignored)
- `modpacks/*.pack.json` + `scripts/build-mrpack.mjs` — single source of truth → client `.mrpack`
  **and** the server mod list
- `launcher/` — Electron app: `src/{main,installer,config,preload}.js`, `renderer/*`, packs in `assets/`
- `servers.json` — runtime server addresses the launcher reads
- `docs/` — `ARCHITECTURE.md`, `ADMIN.md`, `FRIENDS.md`, `DEPLOY-ORACLE.md`

## After the servers are up
1. **Verify:** in `~/norfbay-mc` on the box → `docker compose ps` (both `healthy`); `docker ps`
   shows the user's other containers still running.
2. **Whitelist:** `docker compose exec cobblemon rcon-cli whitelist add <name>` (and `vanilla`).
3. **playit (needs the user):** `docker compose --profile public up -d playit` →
   `docker compose logs playit` → give the claim URL to the user to link their playit.gg account →
   they add tunnels to `127.0.0.1:25565` and `:25566` → put `PLAYIT_SECRET` in `.env` →
   `docker compose --profile public up -d`.
4. **Point launchers at it:** edit `servers.json` with the playit address(es) and `git push`.

## Gotchas / how-to
- Repo is **PUBLIC** (so the Release .exe is downloadable). **Never commit** the box IP, SSH
  details, DB creds, or any secret. Connection info stays in `deploy/TARGET.local` (gitignored).
- Rebuild the launcher: `cd launcher && npm i && CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist`
  → re-upload: `gh release upload v0.1.0 dist/Norfbay-Setup-0.1.0.exe --clobber`.
  (`signAndEditExecutable:false` is set in `package.json` to dodge a Windows symlink error in
  electron-builder — leave it.)
- Rebuild modpacks: `cd scripts && npm i && node build-mrpack.mjs` (`--full` for the epic set).

## Status
- [x] Two servers built + verified (ran on the laptop)
- [x] Launcher `.exe` built + published (Release v0.1.0); runtime `servers.json`
- [x] Java-download bug fixed (Content-Length verify + retry)
- [ ] **Deploy to the Oracle box  ← YOUR TASK**
- [ ] playit set up + `servers.json` pointed at it
- [ ] Whitelist the players (max ~3)
- [ ] (optional) Expand to the "epic" modpacks; add a launcher app icon; code-sign the .exe
