SKYBOUND AR TURBO — TWO PLAYER MOBILE RACING

KEEP THESE EXISTING PATHS EXACTLY:
Frontend: WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/github-pages/
Backend:  WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/render-server/
Render URL: https://skybound-world-server.onrender.com
GitHub Pages URL: https://aimeeshoundev.github.io/AimeeShounDev/WebGLBuilds/SkyboundWorld_GitHub_Render_Ready/github-pages/index.html

INSTALL:
1. Back up your existing project folders.
2. Copy contents of this ZIP's github-pages/ into your existing github-pages/ folder.
3. Copy contents of this ZIP's render-server/ into your existing render-server/ folder.
4. Commit and push to main. Do NOT force push.
5. Wait for Render to redeploy your existing service. Render root directory stays the same.
6. Open the SAME GitHub Pages URL. Hard refresh if you see the old crystal game.

HOW TO PLAY:
- Player 1 creates a room and shares the invite link/code.
- Player 2 joins from another phone.
- Start race when both players are present.
- Hold GO to accelerate; use left/right to steer laterally; brake slows you.
- First player to complete 3 laps wins.
- Tap AR Camera to show live rear camera behind the 3D miniature track.
- On unsupported devices, use 3D Mode.

IMPORTANT LIMITATIONS:
- This is camera-overlay AR, NOT true WebXR plane detection, tracking or shared world anchoring.
- Both players see their own local miniature track; synchronized car race state is shared.
- Requires internet, HTTPS, camera permissions, and access to Three.js/Socket.IO CDNs.
- Game code uses your EXISTING Render service; it does not create or change URLs.
- Track steering affects the lane and visuals; the race is throttle/lap based, not physics-based vehicle handling.
