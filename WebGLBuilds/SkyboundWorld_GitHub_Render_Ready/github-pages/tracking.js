import * as THREE from './vendor/three.module.min.js';
import { AR_SCALE } from './course.js';

const minimumUp = Math.cos(18 * Math.PI / 180);
const waitingMessage = 'Move your phone slowly over a textured, well-lit floor.';

export function isGroundPose(transform, viewerHeight) {
  const m = transform.matrix;
  // The second column is the hit surface’s local +Y normal in gravity-aligned local space.
  return Number.isFinite(m[5]) && m[5] >= minimumUp && viewerHeight - m[13] > 0.12;
}

function describeError(error) {
  if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
    return 'Camera or AR access was blocked. Allow access for this site in Chrome, then try again.';
  }
  if (error.name === 'NotSupportedError') {
    return 'This phone or browser could not start ground tracking with touch controls. Open the page directly in Android Chrome and update Google Play Services for AR.';
  }
  return 'AR setup stopped. ' + (error.message || 'Close other camera apps, then try again.');
}

export function createGroundTracking(view, overlay, onChange, onExit) {
  let session = null, reference = null, source = null, anchor = null, phase = 'idle';
  let revision = 0, requested = false, canPlace = false;
  let stableFrames = 0, stableSince = 0, previous = null, lastMessage = '', lastFailure = '';
  let yaw = 0, usable = false;
  const poseMatrix = new THREE.Matrix4(), coursePose = new THREE.Matrix4();
  const anchorOffset = new THREE.Matrix4(), previousPosition = new THREE.Vector3();
  const position = new THREE.Vector3(), scale = new THREE.Vector3(AR_SCALE,AR_SCALE,AR_SCALE);
  const up = new THREE.Vector3(0,1,0), rotation = new THREE.Quaternion();
  function change(next, message) {
    const different = phase !== next || lastMessage !== message;
    phase = next; lastMessage = message;
    if (different) onChange({phase, message, canPlace, usable});
  }
  function clearHit() {
    previous = null; canPlace = false; requested = false; stableFrames = 0; stableSince = 0;
    view.reticle.visible = false;
  }
  function discardAnchor() {
    revision++; anchor?.delete(); anchor = null;
  }
  function scan() {
    if (!session || !source) return;
    discardAnchor(); clearHit(); usable = false; view.world.visible = false;
    change('scanning', waitingMessage);
  }
  function resetSpace() {
    // A local pose has no durable meaning across an origin reset. A native anchor can relocalize.
    if (!anchor || phase !== 'placed') scan();
  }
  function setWorld(matrix) {
    view.world.matrixAutoUpdate = false; view.world.matrix.copy(matrix);
    view.world.matrixWorldNeedsUpdate = true; view.world.visible = true;
  }
  function visibilityChanged() {
    if (!session || session.visibilityState === 'visible') return;
    if (phase === 'scanning' || phase === 'detected') {
      clearHit(); change('scanning', waitingMessage);
    } else if (phase === 'placed') {
      usable = false; view.world.visible = false;
      change('placed', 'Tracking paused. Point your phone back at the track.');
    }
  }
  function endSession(ended) {
    if (session !== ended) return;
    try { source?.cancel(); } catch { /* An ended session may already have cancelled the source. */ }
    reference?.removeEventListener('reset', resetSpace);
    ended.removeEventListener('visibilitychange', visibilityChanged);
    discardAnchor(); clearHit(); session = null; source = null; reference = null; usable = false;
    view.resetWorld();
    change('idle', ''); onExit(lastFailure); lastFailure = '';
  }
  async function start() {
    if (phase !== 'idle') return;
    clearHit(); usable = false; lastFailure = '';
    change('starting', 'Opening the AR camera…');
    let current;
    try {
      // Called immediately by a tap, before any asynchronous support check can consume activation.
      current = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test','dom-overlay'], optionalFeatures: ['anchors'], domOverlay: {root:overlay}
      });
      session = current; current.addEventListener('end', () => endSession(current), {once:true});
      current.addEventListener('visibilitychange', visibilityChanged);
      current.addEventListener('select', queuePlacement);
      view.world.visible = false;
      await view.renderer.xr.setSession(current);
      if (session !== current) return;
      reference = view.renderer.xr.getReferenceSpace();
      reference.addEventListener('reset',resetSpace);
      const viewer = await current.requestReferenceSpace('viewer');
      if (session !== current) return;
      const hitSource = await current.requestHitTestSource({space:viewer,entityTypes:['plane']});
      if (session !== current) { try { hitSource.cancel(); } catch {} return; }
      if (!hitSource) throw new Error('The phone did not provide a plane hit-test source.');
      source = hitSource; scan();
    } catch (error) {
      if (current && session !== current) return;
      lastFailure = describeError(error);
      if (session) {
        try { await session.end(); } catch { endSession(current); }
      } else {
        change('idle',''); onExit(lastFailure); lastFailure = '';
      }
    }
  }
  function queuePlacement() { if (phase === 'detected' && canPlace) requested = true; }
  function keepHit(hit, hitPose, viewer, t) {
    position.setFromMatrixPosition(poseMatrix.fromArray(hitPose.transform.matrix));
    if (!previous || previousPosition.distanceToSquared(position) > 0.0081) {
      stableSince = t; stableFrames = 0;
    }
    previous = true; previousPosition.copy(position); stableFrames++;
    const viewerMatrix = viewer.transform.matrix;
    const horizontal = Math.hypot(viewerMatrix[8],viewerMatrix[10]);
    if (horizontal > 0.09) yaw = Math.atan2(viewerMatrix[8],viewerMatrix[10]);
    else yaw = Math.atan2(-viewerMatrix[2],viewerMatrix[0]);
    rotation.setFromAxisAngle(up,yaw);
    view.reticle.position.copy(position); view.reticle.position.y += 0.003;
    view.reticle.quaternion.copy(rotation); view.reticle.visible = true;
    canPlace = stableFrames >= 3 && t - stableSince >= 165;
    if (!canPlace) requested = false;
    change(canPlace ? 'detected' : 'scanning', canPlace ? 'Ground found. Place the circuit at the ring.' : 'Hold still for a moment.');
    if (!requested) return;
    requested = false;
    // Use a fresh hit and create the optional native anchor inside this active XR animation frame.
    coursePose.compose(position,rotation,scale); setWorld(coursePose);
    anchorOffset.copy(poseMatrix).invert().multiply(coursePose);
    const thisRevision = ++revision;
    if (typeof hit.createAnchor === 'function') {
      try {
        hit.createAnchor().then(value => {
          if (thisRevision !== revision) { value.delete(); return; }
          anchor = value;
        }).catch(() => { /* Continue using the session’s local space. */ });
      } catch { /* Optional native anchors may be unavailable. */ }
    }
    clearHit(); usable = true;
    change('placed','Track placed on the ground.');
  }
  function frame(t, xrFrame) {
    if (!xrFrame || !session || xrFrame.session !== session || !reference || !source) return;
    const viewer = session.visibilityState === 'visible' ? xrFrame.getViewerPose(reference) : null;
    if (phase === 'placed') {
      const trackedPose = viewer && anchor ? xrFrame.getPose(anchor.anchorSpace,reference) : null;
      usable = Boolean(viewer && (!anchor || trackedPose));
      view.world.visible = usable;
      if (trackedPose) setWorld(poseMatrix.fromArray(trackedPose.transform.matrix).multiply(anchorOffset));
      change('placed', usable ? 'Track placed on the ground.' : 'Tracking paused. Point your phone back at the track.');
      return;
    }
    if (!viewer) { clearHit(); change('scanning',waitingMessage); return; }
    const viewerY = viewer.transform.position.y;
    for (const hit of xrFrame.getHitTestResults(source)) {
      const pose = hit.getPose(reference);
      if (pose && isGroundPose(pose.transform,viewerY)) { keepHit(hit,pose,viewer,t); return; }
    }
    clearHit(); change('scanning',waitingMessage);
  }
  return {start, frame, queuePlacement, scan,
    get active() { return phase !== 'idle'; }, get phase() { return phase; },
    get usable() { return usable; }, get canPlace() { return canPlace; },
    async end() { if(session) { const current = session; try { await current.end(); } catch { endSession(current); } } }
  };
}
