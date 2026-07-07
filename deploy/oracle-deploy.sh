#!/usr/bin/env bash
# Norfbay Minecraft — safe deploy for a SHARED host (e.g. the Oracle box that also
# runs socouniverse + Postgres behind Cloudflare Tunnel).
#
# Safe by design:
#   * Isolated Docker Compose project ("norfbay-mc") + its own network. Never touches
#     your existing containers, networks, Cloudflare Tunnel, or firewall.
#   * Game + RCON bind to 127.0.0.1 ONLY — nothing is exposed on the public interface.
#   * Hard per-container memory caps; ABORTS if there isn't clear RAM headroom, so it
#     can never squeeze your other services.
#   * Opens NO inbound ports. Public play (later) is via playit's OUTBOUND tunnel.
#
# Usage on the box:
#   curl -fsSL https://raw.githubusercontent.com/rmb707/norfbay-mc/main/deploy/oracle-deploy.sh -o oracle-deploy.sh
#   less oracle-deploy.sh                 # review it
#   bash oracle-deploy.sh "YourMinecraftName"
set -euo pipefail

REPO="https://github.com/rmb707/norfbay-mc.git"
DIR="${HOME}/norfbay-mc"
OWNER="${1:-}"

say(){ printf '\n\033[1;36m== %s\033[0m\n' "$*"; }
die(){ printf '\n\033[1;31mABORT: %s\033[0m\n' "$*" >&2; exit 1; }

say "1/6  Docker present?"
command -v docker >/dev/null || die "Docker not installed.  curl -fsSL https://get.docker.com | sh"
docker compose version >/dev/null 2>&1 || die "docker compose plugin missing"
docker ps >/dev/null 2>&1 || die "cannot talk to Docker as $(whoami) — add yourself to the 'docker' group and re-login"

say "2/6  Ports 25565/25566/25575/25576 free on localhost?"
LISTEN="$(ss -tlnH 2>/dev/null | awk '{print $4}')"
for p in 25565 25566 25575 25576; do
  if printf '%s\n' "$LISTEN" | grep -qE "[:.]$p\$"; then die "port $p already in use — resolve before deploying"; fi
done
echo "ok — all free"

say "3/6  Memory headroom (protecting your other services)"
AVAIL=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)   # MB
echo "MemAvailable = ${AVAIL} MB"
if   [ "$AVAIL" -ge 14000 ]; then MEMC=4G;    MEMV=3G;    LIMC=5g; LIMV=4g
elif [ "$AVAIL" -ge 9000  ]; then MEMC=3G;    MEMV=2G;    LIMC=4g; LIMV=3g
elif [ "$AVAIL" -ge 6000  ]; then MEMC=2G;    MEMV=1536M; LIMC=3g; LIMV=2g
else die "only ${AVAIL} MB available — too little to add Minecraft without risking your services. Free RAM or size manually in .env."
fi
echo "chosen: Cobblemon heap ${MEMC} (cap ${LIMC}) · Vanilla heap ${MEMV} (cap ${LIMV})"

say "4/6  Fetch repo -> ${DIR}"
if [ -d "$DIR/.git" ]; then git -C "$DIR" pull --ff-only; else git clone "$REPO" "$DIR"; fi
cd "$DIR"

say "5/6  Write .env (localhost bind, capped memory, both compose files)"
[ -f .env ] || cp .env.example .env
set_kv(){ if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env; else printf '%s=%s\n' "$1" "$2" >> .env; fi; }
if ! grep -q '^RCON_PASSWORD=[A-Za-z0-9]\{16,\}' .env; then
  set_kv RCON_PASSWORD "$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)"
fi
set_kv MC_BIND 127.0.0.1
set_kv MEM_COBBLEMON "$MEMC"
set_kv MEM_VANILLA "$MEMV"
set_kv MEM_LIMIT_COBBLEMON "$LIMC"
set_kv MEM_LIMIT_VANILLA "$LIMV"
set_kv COMPOSE_FILE "docker-compose.yml:docker-compose.oracle.yml"
[ -n "$OWNER" ] && set_kv MC_OWNER "$OWNER"

say "6/6  Start servers (isolated project, localhost only, first boot pulls MC+mods)"
docker compose up -d cobblemon vanilla backup-cobblemon backup-vanilla

echo "waiting for health (up to ~6 min on first boot)…"
for i in $(seq 1 48); do
  s1=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' norfbay-cobblemon 2>/dev/null || echo none)
  s2=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' norfbay-vanilla 2>/dev/null || echo none)
  echo "  cobblemon=$s1  vanilla=$s2"
  if [ "$s1" = healthy ] && [ "$s2" = healthy ]; then break; fi
  sleep 15
done

say "Status"
docker compose ps
echo
say "DONE — nothing else on this box was touched. Game + RCON are on 127.0.0.1 only."
cat <<'EOF'

NEXT STEPS:
  Whitelist players:
    docker compose exec cobblemon rcon-cli whitelist add <name>
    docker compose exec vanilla   rcon-cli whitelist add <name>

  Public play via playit (outbound tunnel — hides this box's IP, opens NO ports):
    docker compose --profile public up -d playit
    docker compose logs playit           # open the claim URL, link your playit.gg account
    # in playit: add tunnels -> 127.0.0.1:25565 (Cobblemon) and 127.0.0.1:25566 (Vanilla)
    # put the agent secret in .env as PLAYIT_SECRET=... then:
    docker compose --profile public up -d

  Point the launcher at it (no new .exe): edit servers.json in the repo with the playit
  address(es) and `git push`. The launcher fetches it on each run.

  Tune memory anytime: edit MEM_COBBLEMON / MEM_VANILLA / MEM_LIMIT_* in .env, then
    docker compose up -d
EOF
