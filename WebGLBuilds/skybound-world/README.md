# Skybound World — Online Multiplayer 3D Game

A complete browser-based **Three.js/WebGL multiplayer world** for **2–4 players per room**, with responsive mobile controls, invite codes, live movement, chat, scoreboards, jumping, collectible crystals, and procedural scenery.

## Quick start

1. Install **Node.js 18 or later** from https://nodejs.org/.
2. Extract this ZIP into a folder.
3. Open a terminal **inside that folder**.
4. Run:

   ```bash
   npm install
   npm start
   ```

5. Visit **http://localhost:3000** in your browser.
6. Enter a name and select **Create a world**. Share the room code or the invite link.

### Test multiplayer locally

Open two browser windows or tabs at http://localhost:3000. Create a room in one and join with the displayed room code in the other. Each browser tab counts as one player.

### Play online with friends on different networks

`localhost` works only on your own machine. To host a public multiplayer game, deploy **the entire Node.js project**, including `server.js`, to a service that supports **persistent Node servers and WebSockets** (e.g. Render Web Service, Railway, or a VPS).

Typical settings:
- Build command: `npm install`
- Start command: `npm start`
- Environment variable: `PORT` is automatically set by most hosts; the server uses it.
- Share the host's HTTPS URL, create a room, and send the room code or copied invite link.

**Important:** GitHub Pages and S3 static website hosting **alone cannot host the Socket.IO server**. They can serve the frontend if you separately host and configure a multiplayer backend, but this packaged version expects the frontend and backend on the same origin. CDN access is required to load the Three.js module on clients.

## Controls

| Action | Desktop | Phone/tablet |
|---|---|---|
| Move | WASD or arrow keys | On-screen directional buttons |
| Jump | Space | JUMP button |
| Rotate camera | Drag with mouse | Drag the world |
| Zoom | Mouse wheel | Not included on touch |
| Chat | Type and Send | Type and Send |
| Invite | Copy button | Copy button |

## Gameplay

- Explore a colorful island with trees, flowers, houses, lanterns, and an ocean.
- Collect the 12 glowing crystals by walking near them.
- All players see shared crystal collection and score changes.
- When all crystals are found, they respawn after 7 seconds.
- Room size is capped at 4; codes are generated on the server.
- Rooms are temporary, in-memory, and deleted when the last player leaves.

## Project structure

```
skybound-world/
  package.json         Node.js scripts and dependencies
  server.js            Express + Socket.IO multiplayer server
  public/
    index.html         UI and game canvas
    style.css          Responsive UI
    game.js            Three.js scene, player avatars, game logic
    assets/
      logo.svg         Original vector logo
      favicon.svg      Original vector favicon
```

## Notes and limitations

- This is a playable **starter multiplayer game**, not a production-grade anti-cheat system. Movement is lightly validated server-side.
- Scores and room state are not stored in a database and reset when a room closes or server restarts.
- For production, add authentication, moderation, persistent storage, and more authoritative movement/collision handling.
- Players cannot walk beyond the island's edge. Decorations are visual; there are no solid building/tree colliders.
- The scene uses procedural Three.js geometry and original SVG assets; no external model downloads are required. Three.js itself loads from a CDN.
- Audio effects are synthesized in-browser and can be muted.

## Customize

- Colors: edit material color values in `public/game.js` and UI colors in `public/style.css`.
- Crystal locations: edit `gems` in `server.js` (the server sends positions to clients).
- Max room size: currently 4; increasing it requires adjusting the `MAX_PLAYERS` limit and UI.
- World props: edit the `tree`, `flower`, and `house` creation loops in `public/game.js`.

Enjoy building!
