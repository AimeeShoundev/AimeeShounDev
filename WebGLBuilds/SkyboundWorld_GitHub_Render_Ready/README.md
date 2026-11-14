# Skybound Ground AR Racing — two players, iPhone + Android

## Important: what kind of AR this is
This is **real marker-tracked AR**. It uses AR.js + A-Frame to track a physical **Hiro marker** lying flat on the ground. The racetrack is attached to that tracked marker and appears to stay in place as you move your phone, as long as the marker remains visible. This is NOT automatic bare-ground plane detection or tap-to-place AR. Cross-platform markerless ground detection generally requires a compatible commercial WebAR platform or separate native apps. This version requires no AR vendor credentials.

## Existing URLs preserved
- GitHub Pages: https://aimeeshoundev.github.io/AimeeShounDev/WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/github-pages/index.html
- Render: https://skybound-world-server.onrender.com
- GitHub frontend folder: WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/github-pages/
- Render root directory: WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/render-server/

## Install
1. Back up your existing project folders.
2. Copy the *contents* of this ZIP's `github-pages/` into the existing repo's `WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/github-pages/` folder. Do not create a second nested folder.
3. Copy the *contents* of this ZIP's `render-server/` into the existing repo's `WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/render-server/` folder.
4. Commit and push to the `main` branch normally (do not force push).
5. In Render, keep the existing service, root directory, and URL. The start command is `npm start`. Wait for deployment to finish.
6. Open the SAME existing GitHub Pages URL on both phones over HTTPS. Allow camera permission. On first access, Render may need time to wake up.

## Ground placement
1. Open and print the marker: https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/hiro.png
2. Place the printed marker flat on the ground in good lighting. Print it about 15–25 cm wide for more stable detection. Avoid glare.
3. On both phones choose Ground AR, create/join the same room, and point each camera at the marker. Both phones can use the same physical marker if they're together, or identical markers in separate places.
4. Once both players are in the room, press READY on both devices. Hold GO to drive, steer left/right, and use BRAKE. Complete 3 laps.
5. Choose 3D Preview to test without camera access. Keyboard: arrows/WASD, Space to brake.

## Technical notes
- Marker tracking requires the marker to remain in camera view. This is not persistent world mapping or shared spatial cloud anchors.
- Player car positions and laps are synchronized through the existing Socket.IO Render server. The game runs at 2 players per room.
- This is a simple prototype with an oval track and arcade controls; steering adjusts effective progress rather than physically simulating lateral motion or collisions.
- CDN-hosted A-Frame, AR.js, and Socket.IO are required; mobile devices need internet access.
- If camera permission fails, test in mobile Safari/Chrome over HTTPS and verify browser camera permissions.
- Some phone/browser combinations may not support AR.js marker tracking reliably. Use 3D Preview as fallback.
- To implement true tap-to-place *markerless* ground plane detection on both iOS and Android, a cross-platform WebAR SDK/license or native ARKit + ARCore apps are needed. Do not represent this marker-based build as markerless AR.
