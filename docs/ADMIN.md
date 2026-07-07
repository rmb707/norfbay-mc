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

## Go public — playit.gg (game traffic)
1. Make a free account at https://playit.gg.
2. Bring the agent up once to claim it: `docker compose --profile public up -d playit`,
   then open the claim URL it prints (`docker compose logs playit`).
3. In the playit dashboard, create tunnels to your laptop's `25565` (Cobblemon) and `25566`
   (Vanilla), and attach a **custom domain** so `minecraft.norfbay.com` (and optionally
   `cobblemon.` / `vanilla.`) CNAME to the tunnel.
4. Paste the agent secret into `.env` as `PLAYIT_SECRET`, then `docker compose --profile public up -d`.

## Go public — website + auth (profile: web)
1. **Cloudflare**: move `norfbay.com` DNS to Cloudflare (free). Zero Trust → Networks → Tunnels →
   create a tunnel, route `play.norfbay.com` → `http://web:3000`, copy the token → `.env` `CF_TUNNEL_TOKEN`.
2. **Google OAuth**: Google Cloud Console → APIs & Services → Credentials → OAuth client (Web).
   Authorized redirect URI: `https://play.norfbay.com/api/auth/callback/google`. Put the client
   id/secret in `.env` (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`); set `AUTH_SECRET` (`openssl rand -base64 32`);
   list friend emails in `ALLOWED_EMAILS`.
3. `docker compose --profile web up -d`.

## No downtime on lid close
Run once, as admin: `powershell -ExecutionPolicy Bypass -File scripts\setup-power.ps1`
and enable Docker Desktop → Settings → General → "Start Docker Desktop when you log in".

## Update a modpack
Edit `modpacks/<game>.pack.json` → `node scripts/build-mrpack.mjs` → update the server's
`MODRINTH_PROJECTS` (or mounted mods) → `docker compose up -d <game>`. Bump the launcher's pack.
