// Static config baked into the launcher. Server addresses default to the public
// domains; until playit.gg is wired you can override the address per game in the UI
// (Advanced), or set a global override in norfbay.override.json in the app's userData.
'use strict';

const MINECRAFT_VERSION = '1.21.1';

const GAMES = {
  cobblemon: {
    id: 'cobblemon',
    name: 'Cobblemon',
    blurb: 'Pokémon in Minecraft — catch, train, and battle across the world.',
    mrpack: 'norfbay-cobblemon.mrpack',
    server: 'cobblemon.norfbay.com',
    accent: '#c56bff',
  },
  vanilla: {
    id: 'vanilla',
    name: 'Vanilla+',
    blurb: 'Pure survival, tuned — performance, visuals, and quality-of-life.',
    mrpack: 'norfbay-vanilla.mrpack',
    server: 'vanilla.norfbay.com',
    accent: '#5bd66b',
  },
};

// Adoptium Temurin 21 JRE (Windows x64) — used when no suitable Java is bundled.
const JAVA = {
  major: 21,
  url: 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk',
};

module.exports = { MINECRAFT_VERSION, GAMES, JAVA };
