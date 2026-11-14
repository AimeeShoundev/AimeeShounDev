<<<<<<< HEAD
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
=======
# Skybound World — GitHub Pages + Render deployment

This package separates the frontend and backend. It is not enough to upload the original ZIP directly to GitHub Pages.

## 1. Upload the multiplayer server to GitHub
Upload the CONTENTS of `render-server/` into a separate repository, e.g. `skybound-server`. At the repository root you should see `server.js`, `package.json`, `render.yaml`.

## 2. Deploy on Render
Visit https://dashboard.render.com/ → New → Web Service → connect `skybound-server`. Choose Node, build command `npm install`, start command `npm start`, and an available plan. Wait for Live. Copy your HTTPS Render URL, e.g. `https://skybound-multiplayer.onrender.com`.

Optional security setting: Render Environment → `CLIENT_ORIGIN` = the origin of your Pages site, e.g. `https://aimeeshoundev.github.io` (no trailing slash or path). This restricts cross-origin browser requests to that origin.

## 3. Set your frontend's server URL
Open `github-pages/config.js` and replace `https://REPLACE-WITH-YOUR-RENDER-URL.onrender.com` with the HTTPS URL from Render. Save.

## 4. Upload the frontend to GitHub Pages
Upload the CONTENTS of `github-pages/` to the directory GitHub Pages publishes. `index.html`, `game.js`, `style.css`, `config.js`, and `assets/` must be next to one another. If you publish from `main` / root, put these files at repository root. If your portfolio publishes from `/docs`, put them in `docs/` or a subfolder under it.

In GitHub repository → Settings → Pages → Build and deployment → Deploy from a branch → select your publishing branch and folder (root or /docs). Wait for the Pages URL to appear. Your game may live at `https://USERNAME.github.io/REPOSITORY/` or at a nested path, depending on your setup.

## 5. Test
Open your Pages URL in two browsers. Create a room on one; use Join and the code on the other. Invite links now preserve the GitHub Pages subdirectory. Test on separate devices. The Render free tier may take time to wake after inactivity.

## Troubleshooting
- `Set your Render URL in config.js`: replace the placeholder with your actual HTTPS Render URL and republish.
- `Connecting to multiplayer server`: wait for Render to wake; verify Render status is Live. Reload the page after it is ready.
- 404 for game.js/style.css: publish the correct directory; keep files next to index.html.
- Blank screen: check browser console for missing Three.js CDN resources or WebGL errors.
- If you are using a GitHub Pages project subfolder, do NOT add a leading slash to local asset paths.
- Render is one server instance with rooms stored in memory. Rooms disappear on server restarts. For persistent rooms or multi-instance scaling, add a database/adapter.

## Local testing
From `render-server/`, run `npm install && npm start`. For local frontend testing set `config.js` to `http://localhost:3000` and serve `github-pages/` using a local HTTP server (not file://). For a simpler local test, the server can also serve the original `public/` folder, but this split package is optimized for deployment.
>>>>>>> origin/main
