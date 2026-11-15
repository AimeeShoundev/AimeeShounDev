# Skybound Basketball

Two players take turns flicking a basketball into a fixed hoop. The first player to make 10 baskets wins. The room shares the ball flight, turn and score between devices.

## Replace the racing game

Extract this ZIP. Its top level contains `github-pages/`, `render-server/` and this guide. Both folders are needed for the online game.

1. **Update the existing Render backend.** Copy all files from `render-server/` into the source folder that already contains your racing server’s `server.js`. Commit and push to the branch your existing **skybound-world-server** service deploys. Deploy that commit on the same service. Its existing Node build and start commands can still be used. The package supports `npm install` or `npm ci` followed by `npm start`.
2. **Check the backend.** Open the service’s health page. When the basketball backend is live, the response includes `"game":"Skybound Basketball"`. [Open the health page](https://skybound-world-server.onrender.com/health)
3. **Update the existing GitHub Pages folder.** In the `AimeeShounDev` repository, copy the **contents** of `github-pages/` into `WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/github-pages/`. Place the new `index.html` directly over the old one. Include the JavaScript files, CSS, icon, `fonts/` and `vendor/`. Commit and push to your usual Pages branch.
4. **Open the game.** After Pages deploys, the existing address opens **Half Court Showdown**. [Open your game page](https://aimeeshoundev.github.io/AimeeShounDev/WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/github-pages/index.html)

The bundled `config.js` is the one from your upload. It points to `https://skybound-world-server.onrender.com`. The client and server each include a copy of `basketball.js` so they can deploy independently and calculate the same ball flight.

## Play together

1. Open the game on both devices. On the first, enter a name and tap **Create a room**. Share the displayed code. On the second, tap **Join room**, enter the same code, then tap **Join this room**.
2. On a supported Android phone, tap **Place hoop in AR**, allow access, and move the phone slowly over a textured, well-lit floor. Aim the ring at the base location. When **Floor found** appears, tap **Place hoop**. Step back about 2 metres and bring the rim into view. The indoor hoop’s rim is about 1.77 metres above the selected surface.
3. Each phone sets its own floor anchor. If you are playing side by side, place both bases on the same spot while facing the same direction. You can also play from different locations.
4. The match starts when both players have set up their courts. On your turn, touch the basketball near the bottom of the screen and flick it upward. Your sideways movement changes aim. Release when the power meter shows **Good power**. Both screens show the shot and whose turn is next.
5. After the winning basket, tap **Play again** for a rematch.

**3D play.** Either player can choose **Play in 3D**, including on an iPhone or desktop with WebGL 2. AR and 3D players can join the same match. In 3D you can also drag with a mouse, or aim with the left and right arrow keys and hold and release **Space** for power.

**One device.** Choose **Play on one device**, select a court, and hand the device to the player named above the hoop after each shot.

## If you need to check something

- **You still see the race.** Check that the Pages commit finished publishing at the exact folder above, then reload the game page.
- **The room will not open.** Check the health page for the basketball game name. If it still shows only the old health response, deploy the updated backend files on the existing service. A sleeping service can take time to respond to the first connection.
- **Ground AR is unavailable.** Open the HTTPS game page directly in Chrome on an ARCore-supported Android phone with Google Play Services for AR installed and enabled. Check the site’s camera permission. The 3D court is also available. [Android WebXR requirements](https://developers.google.com/ar/develop/webxr/requirements)
- **The ring will not settle.** Aim at a flat, textured part of the floor below the phone. Move slowly sideways, then hold the phone steady. A flat tabletop can also register, so aim where the base should stand.
- **Tracking pauses.** Point the phone back toward the hoop. The game pauses new shots during tracking loss. When native anchors are available, the hoop follows its chosen floor anchor. Otherwise its pose stays fixed in the session’s local space. If that space resets, the game prompts for a fresh placement.
- **A player disconnects.** The server holds the seat for 90 seconds. Reconnect using the same tab. After a page reload, choose a court again to resume. An explicit **Leave**, or expiration of the seat, opens the room to a new opponent. Redeploying the service clears its in-memory rooms.
