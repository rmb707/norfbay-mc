# Playing on Norfbay 🎮

You need **Minecraft: Java Edition** (a Microsoft account that owns the game).

Access is private over **Tailscale** — so there are two quick one-time steps: join the
network, then run the launcher.

## 1) Join the Tailscale network (one time)
1. Install **Tailscale**: https://tailscale.com/download and sign in (make a free account).
2. Rob sends you a **share link** for the `rmbsomenmax` machine — click it and **Accept**.
   (This gives your device access to just the game server, nothing else.)
3. Tell Rob your **Minecraft username** so he can whitelist you.

## 2) Run the Norfbay Launcher
1. Get **`Norfbay-Setup-0.1.0.exe`** from Rob and run it (Windows SmartScreen → "More info →
   Run anyway" — it's unsigned).
2. **Sign in with Microsoft** (your Minecraft account).
3. Pick **Cobblemon** or **Vanilla+** → **Play**.
   It installs the right Minecraft version + Fabric + mods and drops you into the server.
   (First launch downloads a bit; after that it's fast.)

That's it — no IP addresses to type. The launcher already knows the servers
(`100.103.103.67:25565` Cobblemon / `:25566` Vanilla+, reachable once you're on Tailscale).

## Troubleshooting
- **"You are not white-listed on this server"** → send Rob your exact Minecraft name.
- **Can't connect** → make sure Tailscale is running/connected and you accepted the share.
- Both servers are Minecraft **1.21.1 (Fabric)** — the launcher sets that up for you.
