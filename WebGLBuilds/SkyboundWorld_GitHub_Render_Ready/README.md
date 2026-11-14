# Skybound Turbo · Ground Circuit

A two-player miniature car race for Android Chrome. Each driver places a circuit on a tracked horizontal surface and races the other car to the finish line over three laps.

## Install on your existing game page

1. Extract the ZIP. Open its `github-pages` folder.
2. Copy the **contents** of that folder into `WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/github-pages/` in your `AimeeShounDev` repository. Include `fonts/`, `vendor/`, all three game modules, the HTML, CSS and `config.js`. The destination should contain `github-pages/index.html` directly.
3. Commit and push the files to your usual Pages branch. When the Pages deployment finishes, open [your existing game page](https://aimeeshoundev.github.io/AimeeShounDev/WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/github-pages/index.html) in Chrome. Look for **Ground Circuit** and **Race together**.

The game uses your current service at `https://skybound-world-server.onrender.com`. The server code and `config.js` in this package match your existing versions byte for byte. Updating the `github-pages` contents is sufficient for your current setup. The matching `render-server` folder is included for completeness. The frontend ships with its rendering library, networking client, and fonts.

## Play on two phones

1. Open the HTTPS game page directly in Chrome on both phones. Use ARCore-compatible Android devices with Google Play Services for AR installed and enabled.
2. Enter your names and agree on a private 4–6 character code made of letters or numbers. Both drivers enter that code and tap **Join room**. The first driver opens the room. The second takes the other starting grid slot.
3. On each phone, tap **Start ground AR**, allow camera access, then move the phone slowly while looking down at a well-lit, textured floor. Leave about 1.7 × 1.0 metres for the model. When the ring settles and **Ground found** appears, tap **Place track**. You can also tap the camera view with the ring over the desired spot.
4. Each driver taps **Ready to race**. Hold **Gas**, use the arrows to steer between lanes, and tap **Brake** to slow down. Steer over the green chevrons for extra speed. The server records the first car across the checkered line after three laps. Tap **Race again** for a rematch.

Each phone sets its own physical origin. The room synchronizes both cars, laps and the winner. If you are side by side, scan the same patch of floor from the same direction for a similar view. The two placements are independent.

## Placement and recovery

- **Try ground placement** on the home screen opens the camera on a supported phone before another driver joins. **Reposition** starts a fresh scan. **Back to lobby** ends that practice session.
- WebXR casts a hit test for real planes. The game checks the surface normal and requires a brief stable, upward-facing hit below the phone. As soon as the hit disappears, the placement button becomes unavailable. Aim at the intended floor. The horizontal-surface test can also accept a tabletop below the camera.
- After placement, the game follows a native WebXR anchor when the browser supplies one. Otherwise it holds the pose in WebXR local space. A local-space reset triggers a fresh placement in that case. If an anchor loses tracking, the course hides and the controls pause until tracking returns.
- If a surface is hard to find, move the phone sideways and aim at visible texture rather than glare or a blank patch. If Chrome blocks the camera, allow it for the game page and tap **Start ground AR** again.
- **Use 3D preview** opens an overhead view with the same multiplayer race. The arrow keys or WASD work on a keyboard. **Change view** lets you switch before getting ready.

[Google's Android WebXR requirements](https://developers.google.com/ar/develop/webxr/requirements) · [ARCore device list](https://developers.google.com/ar/devices)
