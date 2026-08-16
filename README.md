# ⬛ BloxWorlds

A free 3D multiplayer game platform inspired by 2020-era Roblox, built with **Three.js**
and a custom mini-engine. Hosted 100% on **GitHub Pages** — multiplayer included,
**no server needed**.

![icon](assets/icon.png)

## 🎮 Games

| Game | Description |
|------|-------------|
| 🏁 **Mega Obby** | Jump across sky islands, dodge kill bricks, ride moving platforms, duck the spinner, hit 4 checkpoints and reach the golden WIN pad. |

## ✨ Features

- 🕸️ **Serverless P2P multiplayer** — powered by [Trystero](https://github.com/dmotz/trystero)
  (WebRTC). Peers discover each other through public nostr relays, then talk
  **directly to each other**. Works straight from GitHub Pages — open the game on
  two devices and you're playing together.
- 📱 **Mobile supported** — on-screen joystick, jump button, touch camera drag, chat button.
- 🧍 **R15-inspired avatars** — 15-part blocky characters with jointed walk/jump
  animations, face decal, name tags, and customizable outfit colors.
- 🗄️ **Player database** — persistent local profile (name, outfit) and per-game
  stats: plays, wins, deaths, best time, best stage.
- 💬 **In-game chat** with join/leave/checkpoint/win announcements.
- 🔒 **Deeply obfuscated client** — control-flow flattening, RC4 string arrays,
  dead-code injection, self-defending code.

## 🧱 The engine (`src/engine/`)

| Class | Job |
|-------|-----|
| `Engine` | Renderer, scene, lights, camera, clouds, game loop with systems |
| `World` | Parts (bricks) with kinds: `solid`, `kill`, `checkpoint`, `mover`, `spinner`, `win`; collision data; part animation |
| `Avatar` | R15-style 15-part character model + animation |
| `Player` | Physics character controller (gravity, jumping, platform riding, kill/checkpoint/win events) |
| `RemotePlayer` | Network-driven avatar with smooth interpolation |
| `Input` | Keyboard + mouse + mobile touch (joystick / jump / camera) |
| `Network` | Trystero P2P room: profiles, state sync (~15 Hz), chat, events — all peer-validated |
| `Database` | Persistent local player data & stats |

Games live in `src/games/` and just use the engine — see `src/games/obby.js`.

## 🕹️ Controls

| Desktop | Mobile |
|---------|--------|
| WASD / arrows — move | Left joystick — move |
| Space — jump | JUMP button |
| Mouse drag — camera | Drag screen — camera |
| Enter — chat, R — respawn | 💬 Chat button |

## 🌐 Deploy on GitHub Pages

1. Repo Settings → Pages → Deploy from branch → `main` / root.
2. Open `https://YOURNAME.github.io/bloxworlds/` — that's it. Multiplayer works
   immediately because it's peer-to-peer (needs `https://`, which Pages provides).

## 🔨 Development

Readable source lives in `src/`. The site loads only the obfuscated bundles in `js/`
(three.js and trystero are vendored in `vendor/` via an import map).

```bash
cd tools && npm install     # once
node tools/build.js         # bundle (esbuild) + obfuscate -> js/
```

Honest note: client code can never be made *literally* impossible to read —
obfuscation raises the effort massively, and every peer also validates incoming
network data (bounds checks, sanitized names/chat, capped values) so a hacked
client can't crash or spoof other players' games.

## 📁 Structure

```
index.html        hub / game list
obby.html         Mega Obby game page
src/engine/       the BloxWorlds engine (readable source)
src/games/        games built on the engine
js/               obfuscated bundles (what the site loads)
vendor/           three.js + trystero (local, no CDN needed)
tools/build.js    esbuild bundle + obfuscation
assets/ css/      icon, thumbnails, styles
```
