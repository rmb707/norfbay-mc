// Static config baked into the launcher. Servers run on the always-on Oracle box,
// bound to localhost and exposed publicly via playit.gg outbound tunnels (which hide
// the box IP and open no ports). Friends connect through the playit Minecraft-Java
// tunnel hostnames below — SRV-backed, so no port is needed. You can override the
// address per game in the UI (Advanced) for LAN testing, etc.
//
// These are only the FALLBACK if the remote config (servers.json) can't be fetched;
// the live addresses come from REMOTE_CONFIG_URL at startup. Keep them in sync when
// the playit tunnels change.
'use strict';

const MINECRAFT_VERSION = '1.21.1';

// Fetched at startup to resolve server addresses at runtime — so moving the servers
// (laptop -> Oracle box -> a playit address) is a one-line edit to servers.json + push,
// with NO new .exe to rebuild or re-download.
const REMOTE_CONFIG_URL = 'https://raw.githubusercontent.com/rmb707/norfbay-mc/main/servers.json';

const GAMES = {
  cobblemon: {
    id: 'cobblemon',
    name: 'Cobblemon',
    blurb: 'Pokémon in Minecraft — catch, train, and battle across the world.',
    mrpack: 'norfbay-cobblemon.mrpack',
    server: 'expected-champion.gl.joinmc.link', // playit tunnel -> Oracle 127.0.0.1:25565
    accent: '#c56bff',
  },
  vanilla: {
    id: 'vanilla',
    name: 'Vanilla+',
    blurb: 'Pure survival, tuned — performance, visuals, and quality-of-life.',
    mrpack: 'norfbay-vanilla.mrpack',
    server: 'classes-adopted.gl.joinmc.link', // playit tunnel -> Oracle 127.0.0.1:25566
    accent: '#5bd66b',
  },
};

// Adoptium Temurin 21 JRE (Windows x64) — used when no suitable Java is bundled.
const JAVA = {
  major: 21,
  url: 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk',
};

module.exports = { MINECRAFT_VERSION, GAMES, JAVA, REMOTE_CONFIG_URL };
