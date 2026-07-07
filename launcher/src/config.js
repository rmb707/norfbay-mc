// Static config baked into the launcher. Access is over Tailscale (private mesh),
// so the servers are the laptop's Tailscale node. Friends must be on the tailnet
// (installed Tailscale + accepted the share) to reach these. You can override the
// address per game in the UI (Advanced) for LAN testing, etc.
//
// Laptop Tailscale node: rmbsomenmax  (100.103.103.67 / rmbsomenmax.tail635106.ts.net)
// The IP is the most reliable address for shared/guest tailnet accounts; the MagicDNS
// name (rmbsomenmax.tail635106.ts.net:PORT) also works for full tailnet members.
'use strict';

const MINECRAFT_VERSION = '1.21.1';
const HOST = '100.103.103.67'; // laptop's Tailscale IP

const GAMES = {
  cobblemon: {
    id: 'cobblemon',
    name: 'Cobblemon',
    blurb: 'Pokémon in Minecraft — catch, train, and battle across the world.',
    mrpack: 'norfbay-cobblemon.mrpack',
    server: `${HOST}:25565`,
    accent: '#c56bff',
  },
  vanilla: {
    id: 'vanilla',
    name: 'Vanilla+',
    blurb: 'Pure survival, tuned — performance, visuals, and quality-of-life.',
    mrpack: 'norfbay-vanilla.mrpack',
    server: `${HOST}:25566`,
    accent: '#5bd66b',
  },
};

// Adoptium Temurin 21 JRE (Windows x64) — used when no suitable Java is bundled.
const JAVA = {
  major: 21,
  url: 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk',
};

module.exports = { MINECRAFT_VERSION, GAMES, JAVA };
