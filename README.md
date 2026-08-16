# 🟥 BloxWorlds

A free 3D multiplayer game platform inspired by classic Roblox, built with **Three.js**.
Hosted on **GitHub Pages** — the game client is 100% static.

![icon](assets/icon.png)

## 🎮 Games

| Game | Description |
|------|-------------|
| 🏁 **Mega Obby** | Jump across sky islands, dodge kill bricks, ride moving platforms, avoid the spinner, hit 4 checkpoints and reach the golden WIN pad. |

## ✨ Features

- **R15-inspired avatars** — 15-part blocky characters (head, upper/lower torso, upper/lower arms, hands, upper/lower legs, feet) with walk & jump animations, face decal, name tags, and random shirt/pants colors.
- **Real multiplayer** — WebSocket server relays positions, chat, checkpoint & win announcements to everyone in the game. Other players are rendered live with smooth interpolation.
- **Solo mode fallback** — no server? The game still plays perfectly alone.
- **In-game chat** — press Enter to talk.
- **Deeply obfuscated client** — the deployed `js/` bundle is protected with control-flow flattening, RC4-encoded string arrays, dead code injection, self-defending code and more.

## 🕹️ Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move |
| Space | Jump |
| Mouse drag | Camera |
| Scroll | Zoom |
| Enter | Chat |
| R | Respawn at checkpoint |

## 🌐 Playing on GitHub Pages

1. Repo Settings → Pages → Deploy from branch → `main` / root.
2. Open `https://YOURNAME.github.io/bloxworlds/`.

## 🖧 Running the multiplayer server

GitHub Pages can only host static files — it **cannot** run the multiplayer server.
Run it anywhere Node.js runs (your PC, a VPS, Render, Railway, Glitch…):

```bash
cd server
npm install
npm start          # listens on ws://0.0.0.0:8081 (or $PORT)
```

Then open the BloxWorlds home page and paste the server address
(e.g. `ws://localhost:8081`, or `wss://your-host` if behind HTTPS) into the
**Multiplayer Server** box. The home page pings it and shows if it's online.

> Tip: if your site is served over `https://`, browsers require a `wss://`
> (TLS) server address. Hosts like Render/Railway give you `wss://` for free.

## 🔒 Obfuscation / anti-exploit

- Readable source lives in `src/`. The site loads only the obfuscated build in `js/`.
- Rebuild after editing the source:

```bash
cd tools && npm install     # once
node tools/build.js         # from the repo root
```

- The server **never trusts the client**: names/chat are sanitized, message
  size + rate limits are enforced, positions are bounds-checked, and looks
  are validated. (Honest note: *client* code can never be made literally
  impossible to read — obfuscation raises the effort massively, but real
  security always lives on the server, which is why validation is there.)

## 📁 Structure

```
index.html      hub / game list
obby.html       Mega Obby game page
src/            readable source (edit here)
js/             obfuscated build (what the site loads)
tools/build.js  obfuscation build script
server/         Node.js multiplayer WebSocket server
assets/         icon + game thumbnails
css/            styles
```
