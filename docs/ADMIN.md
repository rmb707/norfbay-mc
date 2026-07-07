# Admin runbook

## Daily ops
```bash
docker compose ps                      # what's running + health
docker compose logs -f cobblemon       # follow a server
docker compose restart vanilla         # restart one server
docker compose exec cobblemon rcon-cli # interactive server console (RCON)
docker compose stop                    # take everything down (the "unless I decide" off-switch)
docker compose up -d                   # bring it back
```

## Whitelist (who can join)
```bash
docker compose exec cobblemon rcon-cli whitelist add <mcname>
docker compose exec cobblemon rcon-cli whitelist list
docker compose exec vanilla   rcon-cli whitelist add <mcname>
```
Once the website is live, sign-in there auto-whitelists — this is the manual fallback.

## Make yourself op
Set `MC_OWNER=<yourname>` in `.env` and `docker compose up -d`, or:
```bash
docker compose exec cobblemon rcon-cli op <yourname>
```

## Backups
- Automatic every 2h → `data/backups/<game>/` (14-day retention).
- Restore: stop the server, replace `data/<game>/world*` from a backup archive, start it.
```bash
docker compose stop cobblemon
# extract the chosen archive from data/backups/cobblemon/ over data/cobblemon/
docker compose start cobblemon
```

## Give friends access — Tailscale (private, chosen approach)
No ports are exposed publicly. The servers publish `25565`/`25566` on the host, so they're
reachable over the laptop's Tailscale interface automatically. Give each friend access by
**sharing the node** (they don't need to be members of your tailnet):
1. Friend installs Tailscale (https://tailscale.com/download) and signs in (free account).
2. In the Tailscale admin console → Machines → `rmbsomenmax` → **Share** → create a share link →
   send it to the friend → they **Accept**.
3. They connect via the launcher (address `100.103.103.67:25565` / `:25566` is baked in), and you
   whitelist their Minecraft name (see above).
Laptop node: `rmbsomenmax` · `100.103.103.67` · `rmbsomenmax.tail635106.ts.net`.

> Optional public alternative (not used): a `playit` service exists in `docker-compose.yml`
> behind `--profile public` if you ever want a public `minecraft.norfbay.com` instead.

## No downtime on lid close
Run once, as admin: `powershell -ExecutionPolicy Bypass -File scripts\setup-power.ps1`
and enable Docker Desktop → Settings → General → "Start Docker Desktop when you log in".

## Update a modpack
Edit `modpacks/<game>.pack.json` → `node scripts/build-mrpack.mjs` → update the server's
`MODRINTH_PROJECTS` (or mounted mods) → `docker compose up -d <game>`. Bump the launcher's pack.
