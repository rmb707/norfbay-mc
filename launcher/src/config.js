// Static config baked into the launcher. Servers run on the always-on Oracle box,
// bound to localhost and exposed publicly via playit.gg outbound tunnels (which hide
// the box IP and open no ports). Friends connect through the playit Minecraft-Java
// tunnel host:port below. The port MUST be explicit: Minecraft's --quickPlayMultiplayer
// (used to auto-join) does not perform the SRV lookup a manually-added server entry
// would, so a bare hostname silently connects to the wrong default port 25565 and
// hangs for minutes before giving up. You can override the address per game in the
// UI (Advanced) for LAN testing, etc.
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
    server: 'expected-champion.gl.joinmc.link:6323', // playit tunnel -> Oracle 127.0.0.1:25565
    accent: '#c56bff',
  },
  vanilla: {
    id: 'vanilla',
    name: 'Vanilla+',
    blurb: 'Pure survival, tuned — performance, visuals, and quality-of-life.',
    mrpack: 'norfbay-vanilla.mrpack',
    server: 'classes-adopted.gl.joinmc.link:6339', // playit tunnel -> Oracle 127.0.0.1:25566
    accent: '#5bd66b',
  },
};

// Adoptium Temurin 21 JRE (Windows x64) — used when no suitable Java is bundled.
// Pinned to a specific build so the SHA-256 stays valid (a moving "latest" URL would
// invalidate it) and the download can be integrity-checked. The direct GitHub asset
// URL also drops the api.adoptium.net redirect hop. To bump Java, update url + size +
// sha256 together (from https://api.adoptium.net/v3/assets/latest/21/hotspot?os=windows&architecture=x64&image_type=jre ).
const JAVA = {
  major: 21,
  url: 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.11%2B10/OpenJDK21U-jre_x64_windows_hotspot_21.0.11_10.zip',
  size: 49005708,
  sha256: 'be26677aaa20b39a62edcaab4c8857a8b76673b0f45abc0b6143b142b62717e4',
};

module.exports = { MINECRAFT_VERSION, GAMES, JAVA, REMOTE_CONFIG_URL };
