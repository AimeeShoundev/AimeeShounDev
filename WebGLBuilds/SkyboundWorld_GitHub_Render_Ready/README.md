# Skybound Android Ground AR Turbo — 2 Player

## Existing URLs remain unchanged
- GitHub Pages: https://aimeeshoundev.github.io/AimeeShounDev/WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/github-pages/index.html
- Render: https://skybound-world-server.onrender.com
- Frontend repo folder: WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/github-pages/
- Backend repo folder: WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/render-server/

## Installation
1. Back up the contents of both existing folders.
2. Copy the **contents** of this ZIP's `github-pages` into the existing `github-pages` folder, replacing old game files.
3. Copy the **contents** of this ZIP's `render-server` into the existing `render-server` folder, replacing old server files.
4. Commit and push to `main` (do not force push). Keep Render Root Directory pointing to `WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/render-server`.
5. Wait for Render to deploy, then hard-refresh the existing GitHub Pages URL. Do not change config.js.

## Playing on two Android phones
- Both devices need Chrome and Google Play Services for AR (ARCore) support for ground AR.
- Open the same GitHub Pages URL on both phones. Allow camera permissions.
- Enter the same room code and tap Join. Each phone taps **Start Ground AR**.
- Slowly scan a textured, well-lit, flat floor. When the reticle appears, tap the screen to place the track.
- Each phone places the track independently in its own physical space. The cars and race are synchronized over Socket.IO, but the physical anchors are NOT shared across devices.
- When both players have placed the track, each taps Ready. Hold GO, steer with arrows, and use BRAKE.
- 3D Preview is provided for unsupported devices and desktop testing.

## Limitations
- True markerless floor placement is via WebXR Hit Test, available only on compatible Android devices/browsers; it is not supported in standard iOS Safari.
- This prototype uses WebXR hit-test placement with a local-floor reference space, not persistent cloud anchors. Tracks will not automatically align to the same physical coordinates on different phones.
- Both clients rely on CDN access for Three.js and Socket.IO.
- Race is arcade-style around an oval, with steering changing lanes. It is not free-roaming vehicle physics.
- Test with two actual Android phones before public release.
