# Norfbay Minecraft

Self-hosted Minecraft for friends: **pick a game, hit one button, play** — the right mods and
Minecraft version install automatically. Two experiences, both Fabric **1.21.1**:

- 🟣 **Cobblemon** — Pokémon in Minecraft, curated "epic" pack
- 🟢 **Vanilla+** — performance / QoL / worldgen, keeps the vanilla feel

Hosted on one Windows 11 laptop in Docker. Private access over **Tailscale**, delivered by a
custom **Norfbay Launcher** (`.exe`) that does the one-click install + launch. Players are gated
by both the tailnet and the server whitelist.

> Full design & rationale: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
> Plan of record: `~/.claude/plans/im-looking-to-set-warm-flurry.md`.

## Status
| Phase | What | State |
|---|---|---|
| 1 | Two Fabric servers in Docker (Cobblemon + Vanilla+) | ✅ running |
| 2 | mrpack builder + connectable interim packs | ✅ (full "epic" curation optional) |
| 3 | Norfbay Launcher — one-click `.exe` (install + launch) | ✅ built (`launcher/dist`) |
| 4 | Tailscale access (share node with friends) | ⏳ share the `rmbsomenmax` node |
| 5 | No-downtime (lid/power) — `scripts/setup-power.ps1` | ⏳ run as admin |
| — | Website + Google gate | ❌ dropped (Tailscale + whitelist instead) |

## Quick start (local)
```bash
cp .env.example .env      # then set RCON_PASSWORD (already done if you ran the setup)
docker compose up -d      # starts cobblemon (25565) + vanilla (25566) + backups
docker compose logs -f cobblemon
```
Add yourself to the whitelist, then connect from Minecraft 1.21.1 (Fabric) to
`localhost:25565` (Cobblemon) or `localhost:25566` (Vanilla+):
```bash
docker compose exec cobblemon rcon-cli whitelist add YOUR_MC_NAME
docker compose exec vanilla   rcon-cli whitelist add YOUR_MC_NAME
```

## Giving friends access (Tailscale)
Share the laptop's Tailscale node (`rmbsomenmax`) with each friend and whitelist their Minecraft
name — see [`docs/ADMIN.md`](docs/ADMIN.md). Friends install the `.exe` launcher
(`launcher/dist/Norfbay-Setup-*.exe`) and hit Play; see [`docs/FRIENDS.md`](docs/FRIENDS.md).

## What's where
- `docker-compose.yml` — the whole server stack
- `.env` — secrets (git-ignored); template in `.env.example`
- `modpacks/*.pack.json` — single source of truth for each game's mods (builds client + server)
- `web/` — Next.js site (Google auth, cards, status, whitelist API)
- `launcher/` — Electron launcher
- `scripts/` — `setup-power.ps1`, `build-mrpack.mjs`, helpers
- `docs/` — architecture, friend guide, admin runbook
- `data/` — worlds + backups (git-ignored)
