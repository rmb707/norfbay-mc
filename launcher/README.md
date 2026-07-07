# Norfbay Launcher

A one-click Windows app that installs everything a player needs — Minecraft **1.21.1**,
Fabric, a Java 21 runtime, and the game's modpack — then launches straight into the server.

- **Cobblemon** and **Vanilla+** are picked on the home screen (two cards).
- Sign in with **Microsoft** (your own Minecraft account — required to launch the game).
- The modpacks are **embedded** in the app (`assets/*.mrpack`), so it's self-contained.
- Access is gated by the **server whitelist** — tell Rob your Minecraft name to be added.

## Build the installer (.exe)
```bash
cd launcher
npm install
npm run dist        # -> dist/Norfbay-Setup-0.1.0.exe  (NSIS one-click installer)
```
Run it from dev without packaging:
```bash
npm start
```

## How it works
1. `msmc` opens the Microsoft login and returns your Minecraft profile + token.
2. `installer.js`:
   - `ensureJava` — downloads Adoptium Temurin 21 if no runtime is present
   - `installModpack` — reads the embedded `.mrpack`, downloads + sha1-verifies each mod
   - `ensureFabric` — writes the Fabric loader profile for 1.21.1
3. `minecraft-launcher-core` downloads vanilla assets/libraries and launches with
   `--quickPlayMultiplayer <server>` so you drop straight into the world.

Each game installs into its own instance under `%APPDATA%/Norfbay/instances/<game>`,
so Cobblemon and Vanilla+ never mix mods.

## Updating the packs
Rebuild `dist/norfbay-*.mrpack` at the repo root (`npm run build:packs:full` in `../scripts`),
copy them into `launcher/assets/`, bump `version` in `package.json`, and `npm run dist`.

## Server address
Defaults come from `src/config.js` (`cobblemon.norfbay.com` / `vanilla.norfbay.com`).
Until playit.gg is wired, use **Advanced → Server address override** to point at a LAN IP
(e.g. `192.168.x.x:25565`) for testing.

## Notes
- The build is **unsigned**, so Windows SmartScreen shows "More info → Run anyway". A code-signing
  cert removes this later.
- First launch downloads Minecraft assets (~300 MB) + Java (~45 MB); subsequent launches are fast.
