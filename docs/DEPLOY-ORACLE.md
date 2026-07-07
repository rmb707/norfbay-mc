# Deploy on the Oracle box (private IP, public play via playit)

Goal: run both servers on your Oracle Cloud box for a 2–3 player group, **without exposing
the box's IP or opening any inbound ports** (it hosts other important files).

How the safety works:
- Minecraft binds to **127.0.0.1** only (`MC_BIND=127.0.0.1`) — not reachable from the internet.
- **playit** tunnels outbound and forwards to those localhost ports, so friends connect to a
  playit address (or `minecraft.norfbay.com`) and **never see your box IP**. No inbound firewall
  rule is added; your VCN security list stays closed.
- Docker only mounts `./data`, so the game containers **cannot read your other files**.

Everything runs on ARM (Ampere A1) or x86 — `itzg/minecraft-server` is multi-arch.

## 1) Prereqs on the box (once)
```bash
# Docker + compose plugin (Ubuntu or Oracle Linux, ARM or x86):
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # log out/in after this
docker version && docker compose version
```

## 2) Clone + configure
```bash
git clone https://github.com/rmb707/norfbay-mc.git
cd norfbay-mc
cp .env.example .env
free -h    # check RAM, then edit .env:
```
In `.env` set:
```
RCON_PASSWORD=<long random string>
MC_OWNER=<your Minecraft name>
MC_BIND=127.0.0.1          # <-- important: keeps the game off the public interface
MEM_COBBLEMON=4G           # 2-3 players; raise if you have RAM to spare
MEM_VANILLA=3G
```

## 3) Start the servers (localhost only)
```bash
docker compose up -d
docker compose ps
docker compose exec cobblemon rcon-cli whitelist add <name>   # add each player
```

## 4) Public play via playit (hides the IP)
```bash
# claim the agent (first run prints a URL in the logs):
docker compose --profile public up -d playit
docker compose logs playit          # open the claim URL, link it to your playit.gg account
```
In the playit dashboard: create two tunnels → `127.0.0.1:25565` (Cobblemon) and `127.0.0.1:25566`
(Vanilla). Optionally attach a custom domain so `minecraft.norfbay.com` points at the tunnel.
Then put the agent secret in `.env` (`PLAYIT_SECRET=...`) and:
```bash
docker compose --profile public up -d
```

## 5) Point the launcher at the new address (no rebuild)
Edit **`servers.json`** in the repo with the playit addresses and push:
```json
{ "cobblemon": { "server": "your-tunnel.playit.gg:PORT" },
  "vanilla":   { "server": "your-tunnel.playit.gg:PORT" } }
```
```bash
git commit -am "point launcher at Oracle/playit" && git push
```
The launcher fetches `servers.json` on each run, so everyone gets the new address automatically —
no new `.exe`.

## 6) Do NOT open the game ports in Oracle
Leave the VCN security list and host firewall closed for 25565/25566. playit is outbound-only;
opening ports would defeat the whole point (and re-expose the box). RCON stays on localhost.

## Ops
Same as `docs/ADMIN.md` (whitelist, backups, restart). The box is always-on, so the laptop
lid/power steps are no longer needed.
