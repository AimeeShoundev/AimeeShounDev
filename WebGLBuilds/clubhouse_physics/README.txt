CLUBHOUSE PHYSICS STARTER
1. Put your ORIGINAL Blender-exported clubhouse GLB in this folder as clubhouse.glb.
2. Upload all files together to your existing GitHub Pages game folder, retaining its URL and folder structure. Do not overwrite your live game until you have tested a separate copy.
3. Open the game via an HTTPS server (GitHub Pages), not file://.
4. Click Object names to inspect mesh names. Edit settings.js MOVABLE_NAMES if your VHS tapes, paddles, or balls use different names.
5. Set START_POSITION and MODEL_SCALE in settings.js for your scene.
6. WASD to walk; drag to look; click centered movable object or press E to grab/drop; F to throw. Touch controls included.

IMPORTANT LIMITATIONS:
- The original clubhouse GLB was not accessible for packaging, so the ZIP includes a standalone demo fallback. This is NOT a verified integration with your model.
- Static mesh colliders are simple axis-aligned bounding boxes, not accurate triangle meshes. Large combined building meshes may block walking or prevent grabbing objects. Split floor/shelf/wall meshes or replace with suitable trimesh/compound colliders after examining the GLB.
- Movable mesh colliders are bounding boxes; spheres/paddles may need tailored shapes.
- Player movement is camera-based and not yet collision constrained. Multiplayer synchronization is NOT included; this does not alter your existing server config or URL.
- All dependencies use CDN ES modules and require internet access.
- Meshes must be separate objects inside the GLB to be independently movable.
