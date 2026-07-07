# Norfbay Minecraft — Handoff

**Status: LIVE.** Everything is built and published. The only thing left is to deploy the two
servers onto the always-on Oracle box — which must be done from the PC that has the SSH key.

## Live links
- **Repo (public):** https://github.com/rmb707/norfbay-mc
- **Launcher download (share with friends):**
  https://github.com/rmb707/norfbay-mc/releases/download/v0.1.0/Norfbay-Setup-0.1.0.exe
- **Agent instructions (auto-loaded by Claude Code):**
  https://github.com/rmb707/norfbay-mc/blob/main/CLAUDE.md

## What's done
- Two Minecraft servers — **Cobblemon** + **Vanilla+**, both Fabric 1.21.1 (Docker / `itzg`), with
  RCON, whitelist, and auto-backups. Verified healthy.
- **Windows launcher `.exe`** — one click: installs Minecraft + Fabric + Java 21 + the modpack and
  launches into the server (fixed a Java-download bug; shows real progress). Published as Release v0.1.0.
- Launcher reads **`servers.json`** at runtime → the server address can change with a commit, **no new .exe**.
- **Safe Oracle deploy** ready: isolated project, localhost-bind, hard memory caps, preflight that
  aborts if unsafe. Touches nothing else on the box.

## Finish it — on the PC that has the key (`~/.ssh/oci_livekit`)
```bash
git clone https://github.com/rmb707/norfbay-mc.git
cd norfbay-mc

# your box details, kept local (gitignored, never published):
printf 'SSH_TARGET="ubuntu@146.235.200.235"\nSSH_KEY="$HOME/.ssh/oci_livekit"\nMC_NAME="YOUR_MC_NAME"\n' > deploy/TARGET.local

claude          # then say:  read CLAUDE.md and deploy
```
The agent there has the full context in `CLAUDE.md`. It will SSH in, recon read-only, run the safe
deploy, verify your other containers are untouched, whitelist you, and walk the playit setup.

Prefer to run it yourself instead of via the agent? On the box:
```bash
curl -fsSL https://raw.githubusercontent.com/rmb707/norfbay-mc/main/deploy/oracle-deploy.sh -o oracle-deploy.sh
bash oracle-deploy.sh "YOUR_MC_NAME"
```

## ⚠️ Safety (the box is production)
It runs your web app + Postgres + a Cloudflare Tunnel. The deploy is built to **never** touch
anything not named `norfbay-*`, opens **no** inbound ports (public play is playit's outbound
tunnel, which also **hides the box IP**), and **aborts** if RAM headroom is tight.

## After deploy
1. `docker compose ps` → both `healthy`; `docker ps` → your other containers still up.
2. Whitelist: `docker compose exec cobblemon rcon-cli whitelist add <name>` (and `vanilla`).
3. **playit** (public play, hidden IP): `docker compose --profile public up -d playit` →
   `docker compose logs playit` → open the claim URL → add tunnels to `127.0.0.1:25565` and
   `:25566` → put `PLAYIT_SECRET` in `.env` → `docker compose --profile public up -d`.
4. Edit **`servers.json`** with the playit address(es) and `git push` → every launcher auto-updates.

## Optional polish (later)
Expand to the "epic" modpacks (Cobblemon addons + worldgen), add a real launcher app icon,
code-sign the `.exe` to remove the SmartScreen warning.
