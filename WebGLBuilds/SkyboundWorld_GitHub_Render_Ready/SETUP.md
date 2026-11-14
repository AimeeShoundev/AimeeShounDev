# Skybound Turbo — replacement for your existing Skybound World

**Do not change URLs or folder names.** This is a replacement for your current project, not a new deployment.

## 1. GitHub Pages
Replace the CONTENTS of `WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/github-pages/` with the contents of this ZIP’s `github-pages/`. Keep the directory name exactly the same.

## 2. Render backend
Replace the CONTENTS of `WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/render-server/` with this ZIP’s `render-server/`. Do not change your existing Render service root directory or create a new service.

## 3. Commit / push
Commit and push normally. Do NOT force push. If the repository has diverged, sync carefully first or edit against latest GitHub main. Render should auto-deploy; otherwise use Manual Deploy > Deploy latest commit.

## 4. Check server
https://skybound-world-server.onrender.com/health should show game `skybound-turbo-car-racing`. If it still says `skybound-race`, the old backend is still deployed.

## 5. Play
https://aimeeshoundev.github.io/AimeeShounDev/WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/github-pages/index.html

Create a room; the host presses Start Race. Up to 4 players. WASD/arrows: throttle, reverse and steering; Space: brake. Mobile controls included. Race through 8 checkpoints per lap, 3 laps, first to finish wins.

Note: three.js and Socket.IO libraries are loaded from public CDNs. The client requires an internet connection. This is an arcade prototype with simple car physics and checkpoint validation, not a production anti-cheat racing simulation.
