ORIGINAL CLUBHOUSE PHYSICS BUILD

Includes original clubhouse(5).glb unchanged as assets/clubhouse.glb.
Video_Case_Bp*, Blank_tape_bp, Ping_Pong_Paddle_Bp*, and nearby Ping_Pong_Ball_bp are grab targets.
House, shelf and ping pong furniture colliders use mesh triangles.
WASD to move, drag to look, aim at a tape and click or press E to grab/drop, F to throw.
Deploy the contents into your existing WebGLBuilds/clubhouse_physics directory.
This build is not browser-render-tested and does not yet implement multiplayer synchronization or player-wall collision.

UPDATE: Floor and player collision + arrow-key movement.
A Rapier kinematic capsule and character controller now prevent walking
through properly collidable scene meshes and falling through floors.
Arrow keys and WASD both move the player; keyboard arrows do not scroll.
The player controller requires accurate GLB collider geometry.
This version is code-checked, not browser-render-tested.

VISIBLE FIRST-PERSON HAND:
A procedural 3D hand is rendered in front of the camera. It closes when
carrying an object and opens when releasing or throwing. E/click grab.
The hand is cosmetic: objects are held by the existing Rapier physics system.
For anatomically realistic gripping or VR hand tracking, a rigged hand model
and an inverse-kinematics interaction system would be needed.
Not browser-tested.
