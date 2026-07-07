# Norfbay Minecraft

Self-hosted Minecraft for friends: **pick a game, hit one button, play** — the right mods and
Minecraft version install automatically. Two experiences, both Fabric **1.21.1**:

- 🟣 **Cobblemon** — Pokémon in Minecraft, curated "epic" pack
- 🟢 **Vanilla+** — performance / QoL / worldgen, keeps the vanilla feel

Hosted on one Windows 11 laptop in Docker. Public game access via **playit.gg**
(`minecraft.norfbay.com`), a Google-gated site at **play.norfbay.com**, and a custom
**Norfbay Launcher** that does the one-click install + launch.

> Full design & rationale: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
> Plan of record: `~/.claude/plans/im-looking-to-set-warm-flurry.md`.

## Status
| Phase | What | State |
|---|---|---|
| 1 | Two Fabric servers in Docker (Cobblemon + Vanilla+) | ✅ running locally |
| 1b | playit.gg public tunnel → `minecraft.norfbay.com` | ⏳ needs playit account |
| 2 | Curated "epic" modpacks + `.mrpack` build | 🔜 |
| 3 | `play.norfbay.com` — Google gate + auto-whitelist API | 🔜 needs Google OAuth |
| 4 | Norfbay Launcher (Electron) | 🔜 |
| 5 | No-downtime (lid/power), backups, docs | 🔜 |

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

## Going public / adding the site + launcher
See [`docs/ADMIN.md`](docs/ADMIN.md) for playit.gg, Cloudflare Tunnel, Google OAuth, and the
compose `profiles` (`--profile public`, `--profile web`).

## What's where
- `docker-compose.yml` — the whole server stack
- `.env` — secrets (git-ignored); template in `.env.example`
- `modpacks/*.pack.json` — single source of truth for each game's mods (builds client + server)
- `web/` — Next.js site (Google auth, cards, status, whitelist API)
- `launcher/` — Electron launcher
- `scripts/` — `setup-power.ps1`, `build-mrpack.mjs`, helpers
- `docs/` — architecture, friend guide, admin runbook
- `data/` — worlds + backups (git-ignored)
