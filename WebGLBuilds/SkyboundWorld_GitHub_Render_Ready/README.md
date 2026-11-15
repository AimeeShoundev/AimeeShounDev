# Skybound Turbo — Android Ground-Tracked AR (2 players)

## No markers. True plane detection.
Uses **WebXR immersive-ar + hit-test**, backed by **ARCore** on compatible Android phones. Move the phone over a textured, well-lit horizontal surface until a green reticle appears. Tap **PLACE TRACK ON GROUND** to anchor the racetrack at the detected surface. A printed marker is not used.

## Hosting (unchanged)
- GitHub Pages: https://aimeeshoundev.github.io/AimeeShounDev/WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/github-pages/index.html
- Render: https://skybound-world-server.onrender.com
- Repo frontend: `WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/github-pages/`
- Repo backend: `WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/render-server/`

**Installation:** Back up your current folders, then replace only the contents of the two existing folders with the corresponding contents in this ZIP. Commit/push normally; do not force push. Render must deploy the updated backend from its existing root directory. Do not rename directories or change `config.js`.

## Playing
1. On both Android phones, update Chrome and Google Play Services for AR, open the HTTPS GitHub Pages link in Chrome, and allow camera access.
2. Both players enter the same 4–6 character room code and tap Join. The Render free service may take time to wake.
3. Tap Start Ground AR, move the phone slowly over a textured, well-lit floor, and wait for the green reticle.
4. Tap PLACE TRACK ON GROUND. Both players independently place their own local copy of the track. The game synchronizes cars and race progress, **not a shared real-world spatial anchor**.
5. Once both players place their tracks, tap Ready to race and drive with the onscreen buttons.

## Troubleshooting
- AR unavailable: requires a compatible ARCore Android phone, current Chrome, Google Play Services for AR, and HTTPS. A normal browser preview or iOS Safari cannot run this Android WebXR mode.
- No surface detected: move the phone slowly; aim at textured surfaces with good light. Blank/glossy floors can fail.
- Camera opens but no buttons: the AR browser must support WebXR DOM Overlay; this app requests it explicitly.
- Can't connect: wait for Render to wake; check the server deployment and `https://skybound-world-server.onrender.com/health`.
- 3D Preview is a fallback for testing gameplay without AR.

## Verification limitations
JavaScript syntax and ZIP structure can be checked offline. Actual WebXR hit testing, ARCore compatibility, camera permission, and live two-phone networking require tests on real Android devices.
