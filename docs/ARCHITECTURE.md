# Architecture

## Goal
Friends pick a game, click one button, and play — correct mods + Minecraft version installed
automatically. Two experiences, both **Fabric 1.21.1 / Java 21**, so they feel consistent.

## Why it's shaped this way (hard constraints)
1. **A browser can't install/launch Minecraft.** Sandboxing + Minecraft only launches via the
   player's own Microsoft account. → A real desktop **launcher** does install & launch; the
   website only gates access and hands off.
2. **Raw Minecraft is TCP; free tunnels for it are limited.** Cloudflare/Tailscale don't serve
   raw MC on free tiers. → **Two public planes:** playit.gg (TCP → game) and Cloudflare Tunnel
   (HTTPS → website/API).
3. **A Google gate only matters if it reaches the server.** → After Google sign-in, the player's
   Minecraft UUID is added to the server **whitelist over RCON**; servers stay `online-mode=true`.
4. **Best experience per game = distinct modpacks.** One client can't cleanly run both at once, so
   "choose your game" happens in the launcher (two cards), each launching into its own server.

## Components
```
Friend PC: Norfbay Launcher (Electron)
  └─ Google sign-in (allowlist) → Microsoft/MC auth → install MC+Fabric+pack → whitelist → launch
                                                                                   │           │
                                    HTTPS  play.norfbay.com (Cloudflare Tunnel) ◀──┘           │
                                    TCP    minecraft.norfbay.com (playit.gg) ◀─────────────────┘

Laptop (Docker Desktop / WSL2), network "norfbay":
  web (Next.js)      — Google OAuth, cards, status, POST /api/whitelist (RCON), GET /api/pack
  cobblemon (itzg)   — FABRIC 1.21.1, RCON, whitelist  :25565
  vanilla   (itzg)   — FABRIC 1.21.1, RCON, whitelist  :25566
  playit             — TCP tunnel → the two servers          (profile: public)
  cloudflared        — HTTPS tunnel → web                    (profile: web)
  backup-*           — itzg/mc-backup every 2h
```
RCON is **never** published publicly — the web app reaches it via the internal Docker network
(`cobblemon:25575`, `vanilla:25576`→25575). Only ports 25565/25566 (game) go out through playit.

## Single source of truth for mods
`modpacks/<game>.pack.json` lists every mod with a `side` (client/server/both). `scripts/build-mrpack.mjs`
resolves versions from Modrinth and emits **both**:
- the client **`.mrpack`** the launcher installs, and
- the **server** mod list (mirrors the `MODRINTH_PROJECTS` env in `docker-compose.yml`).

This keeps client and server in lockstep — content/worldgen mods on both sides, render mods
(Sodium/Iris) client-only, perf/admin (spark/chunky) server-only.

## Data & resilience
- Worlds under `data/<game>/` (bind mount, git-ignored); backups under `data/backups/`.
- `restart: unless-stopped` on everything; Docker Desktop starts on login → stack self-heals.
- Lid-close (AC) = "do nothing" via `scripts/setup-power.ps1` → no downtime unless you choose it.
