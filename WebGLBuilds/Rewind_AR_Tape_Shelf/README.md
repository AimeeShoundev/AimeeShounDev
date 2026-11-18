# Rewind — Three.js AR tape shelf

This is a complete static app built around your original `blockbustervideoshelfwithtapes.glb` file. It includes the model, all its embedded textures, and a local copy of Three.js 0.182.0. It does not need a multiplayer server, API key, build step, or CDN.

## Use it on your phone

1. Open the deployed HTTPS page in **Chrome on an ARCore-supported Android phone**, with **Google Play Services for AR** installed and enabled.
2. Choose **Place in my room** and allow AR access.
3. Slowly scan a well-lit floor with visible texture. When the gold ring appears, press **Place shelf here**. The center of the shelf will be placed at the ring, facing you.
4. Tap a tape cover, or choose one under **Browse tapes**. The actual case leaves the shelf and moves in front of you.
5. Drag horizontally or vertically for unrestricted 360° rotation. **Front**, **Back**, **Auto-spin**, pinch, and **+/−** are available while you stay in AR.
6. Choose **Return to shelf**. The tape animates back to its exact original slot. Choose another tape.

The shelf starts at 175 cm high and is about 199 cm wide. The **Shelf height** slider changes its size while keeping its bottom on the floor. **Move shelf** restarts floor scanning; Rotate left/right changes its facing direction.

AR placement is for the current session. It is not saved between visits. Optional WebXR anchors stabilize placement when supported. No marker or printed image is used. Real-room depth occlusion and lighting estimation are not included.

## Device support

Full interactive AR requires `immersive-ar`, hit testing, and DOM overlays. This build targets compatible Android devices in Chrome. AR support is checked at runtime, and missing required features produce an explanation instead of a camera-only imitation.

iPhone/iPad Safari does not support this interactive WebXR room mode. Desktop browsers and unsupported phones get a **3D preview**, with the same tape selection, front/back inspection and return controls. A separate iOS AR implementation or compatible WebAR runtime would be needed for full iPhone AR.

Open the link directly in Chrome, not an embedded social-media browser. HTTPS is required for camera AR; opening `index.html` as a local file will not work. Very plain, reflective, dark, or moving surfaces can make floor tracking difficult.

## Upload to GitHub Pages

Unzip this package and upload **all of its contents together** to the folder you want to serve. `index.html`, `app.js`, `tapes.js`, `style.css`, `assets/`, and `vendor/` must stay together. All asset references are relative, so the app works in a repository subfolder without changing its paths.

Enable GitHub Pages for the appropriate branch/folder if it is not already enabled. Open the resulting HTTPS URL on your phone. This package contains no Render URL or multiplayer configuration and does not require changing an existing server. Choose a separate folder if your other games must remain available.

To preview on a computer, serve this folder through a local HTTP server, for example `python -m http.server 8000`, then open `http://localhost:8000`. A phone visiting a plain HTTP LAN address will not have a secure AR context.

## Controls

| Action | Touch / mouse | Keyboard |
|---|---|---|
| Browse shelf in 3D preview | Drag; pinch / scroll to zoom | Browse tapes button |
| Pick up a tape | Tap cover or Browse tapes | Tab to a tape in the list, Enter |
| Rotate held tape | Drag horizontally or vertically | Arrow keys |
| Change inspection distance | Pinch / scroll or +/− buttons | + / − |
| Front / back / continuous spin | Front / Back / Auto-spin | Tab to the button, Enter |
| Return to shelf | Return to shelf button | Escape |

## What was verified

- The GLB contains 22 separate tape cases and 23 embedded images.
- The distributed GLB is byte-for-byte identical to the upload.
- Tests using the actual GLB geometry passed pickup, 360° rotation, front/back targets, distance limits, and exact return for all 22 tapes.
- Additional tests passed for a moved/rotated/resized AR placement, anchor correction during inspection, interruption during pickup or return, and off-center preview camera framing.
- Front/back texture orientation was checked directly against the model's UVs. Original material names that do not match their visible covers were corrected in the displayed tape titles only.
- JavaScript syntax and bundled file references were checked.
- The available test browser had WebGL disabled. **Actual browser rendering, touch interaction, and physical AR tracking have not been verified on a real phone.**

## Files and implementation

- `app.js`: scene, lighting, floor hit tests, anchors, AR lifecycle, touch controls, and interface.
- `tapes.js`: centered tape pivots, camera-relative inspection, unrestricted rotation, animated exact return.
- `assets/blockbustervideoshelfwithtapes.glb`: your unchanged source model.
- `vendor/`: pinned Three.js runtime and required add-ons; MIT license included.

The app keeps the original mesh, materials and UVs for each case. It creates a centered parent pivot instead of replacing the model. A selected tape is reparented to the scene, and its original local transform is restored exactly after returning. The room camera remains visible throughout AR inspection.

Reference: https://developers.google.com/ar/develop/webxr/requirements
