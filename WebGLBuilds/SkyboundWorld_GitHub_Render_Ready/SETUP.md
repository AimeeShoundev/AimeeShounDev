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
