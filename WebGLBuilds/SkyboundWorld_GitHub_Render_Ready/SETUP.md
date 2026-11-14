# Skybound Race — multiplayer racing conversion

This is a **separate game** from the original Skybound World. Keep the existing game and its Render service untouched.

## What changed
- 2–4 player race rooms, host-controlled 3.5-second countdown
- 8 sequential checkpoints around the island, 3 laps, finishing order
- Shared lap/leaderboard, online movement and chat, keyboard/touch controls
- Server checks checkpoint order and position; no gems

## 1. Deploy the new Render server
1. Upload the `render-server` folder to a NEW repository, e.g. `skybound-race-server`, or upload it to a new folder in your existing repository.
2. In Render, create a **new Web Service**, not a Static Site. Connect the repository.
3. If stored in your existing repo, set Root Directory to that new folder's `render-server` path. If uploaded at repository root, leave Root Directory blank.
4. Build command: `npm install`. Start command: `npm start`. Use Node runtime.
5. After deployment, copy its HTTPS address, e.g. `https://skybound-race-server.onrender.com`.
6. Check `https://YOUR-SERVER.onrender.com/health` for a JSON response.

## 2. Publish the game
1. Open `github-pages/config.js` and replace the example Render URL with the exact URL for your NEW race service.
2. Upload the **contents** of `github-pages` to a NEW folder in your GitHub Pages repository, e.g. `WebGLBuilds/skybound-race/`. Put `index.html`, `game.js`, `style.css`, `config.js`, and `assets/` together.
3. Commit and wait for GitHub Pages to deploy. Do not force push. If GitHub Desktop asks for force push, edit files on github.com instead.
4. Open `https://aimeeshoundev.github.io/AimeeShounDev/WebGLBuilds/skybound-race/index.html` (if you used that folder).
5. Create a race room, share its code, and have the host click **Start Race**. Race around the torus track through checkpoints in sequence.

## Notes
- Existing `skybound-world-server` is **not compatible** with this new race frontend. You must deploy the included race backend as a separate service.
- Free Render instances may sleep and take time to wake up.
- Race state is stored in memory; server restarts erase rooms.
- Server validates checkpoint sequence and proximity, but this is a casual prototype rather than a cheat-proof competitive game.
- Three.js and Socket.IO load from public CDNs; internet is required.
