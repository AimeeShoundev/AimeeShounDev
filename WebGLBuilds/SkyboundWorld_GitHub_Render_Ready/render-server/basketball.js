/* The Pages client and the Render service use this identical, fixed-step simulation. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SkyboundBasketball = factory();
})(globalThis, function () {
  'use strict';
  const PROTOCOL = 'skybound-basketball-1';
  const TARGET = 10;
  const STEP = 1 / 120;
  const COURT = Object.freeze({
    rimY: 3.05, rimRadius: 0.31, tubeRadius: 0.023, ballRadius: 0.119,
    boardZ: -0.43, boardY: 3.45, boardWidth: 1.94, boardHeight: 1.15, boardDepth: 0.064
  });
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function validThrow(input) {
    if (!input || !Array.isArray(input.origin) || input.origin.length !== 3 ||
        !input.origin.every(Number.isFinite) || !Number.isFinite(input.aim) || !Number.isFinite(input.power)) return false;
    const [x, y, z] = input.origin, distance = Math.hypot(x, z);
    return distance >= 0.65 && distance <= 11 && y >= 0.15 && y <= 5.2 &&
      Math.abs(input.aim) <= 0.76 && input.power >= 0.68 && input.power <= 1.36;
  }

  function launch(input) {
    const [x, y, z] = input.origin, distance = Math.hypot(x, z), gravity = 9.81;
    const apex = Math.max(y, COURT.rimY) + 0.78 + distance * 0.115;
    const vy = Math.sqrt(2 * gravity * (apex - y));
    const toRim = (vy + Math.sqrt(2 * gravity * (apex - COURT.rimY))) / gravity;
    const heading = Math.atan2(-x, -z) - input.aim;
    const speed = distance / toRim * input.power;
    return [Math.sin(heading) * speed, vy, Math.cos(heading) * speed];
  }

  function simulate(input) {
    const c = COURT, radius = c.ballRadius, contact = radius + c.tubeRadius;
    let [x, y, z] = input.origin, [vx, vy, vz] = launch(input);
    let madeAt = null, floorAt = null;
    const samples = [[x, y, z]], events = [], lastSound = {};
    function hit(kind, time) {
      if (time - (lastSound[kind] ?? -1) > 0.085) {
        events.push({kind, time}); lastSound[kind] = time;
      }
    }
    function bounce(nx, ny, nz, depth, restitution, kind, time) {
      x += nx * depth; y += ny * depth; z += nz * depth;
      const toward = vx * nx + vy * ny + vz * nz;
      if (toward >= 0) return;
      const impulse = (1 + restitution) * toward;
      vx = (vx - impulse * nx) * 0.98;
      vy = (vy - impulse * ny) * 0.98;
      vz = (vz - impulse * nz) * 0.98;
      if (toward < -0.3) hit(kind, time);
    }
    for (let step = 1; step <= 540; step++) {
      const t = step * STEP, ox = x, oy = y, oz = z;
      x += vx * STEP; y += vy * STEP - 0.5 * 9.81 * STEP * STEP; z += vz * STEP; vy -= 9.81 * STEP;
      const bx = x - clamp(x, -c.boardWidth / 2, c.boardWidth / 2);
      const by = y - clamp(y, c.boardY - c.boardHeight / 2, c.boardY + c.boardHeight / 2);
      const bz = z - clamp(z, c.boardZ - c.boardDepth / 2, c.boardZ + c.boardDepth / 2);
      const boardDistance = Math.hypot(bx, by, bz);
      if (boardDistance > 0.000001 && boardDistance < radius) {
        bounce(bx / boardDistance, by / boardDistance, bz / boardDistance, radius - boardDistance, 0.68, 'board', t);
      }
      const radial = Math.hypot(x, z);
      if (radial > 0.000001 && Math.abs(y - c.rimY) < contact) {
        const factor = 1 - c.rimRadius / radial;
        const rx = x * factor, ry = y - c.rimY, rz = z * factor;
        const ringDistance = Math.hypot(rx, ry, rz);
        if (ringDistance > 0.000001 && ringDistance < contact) {
          bounce(rx / ringDistance, ry / ringDistance, rz / ringDistance, contact - ringDistance, 0.50, 'rim', t);
        }
      }
      if (madeAt === null && floorAt === null && oy > c.rimY && y <= c.rimY && vy < 0) {
        const f = (oy - c.rimY) / (oy - y);
        if (Math.hypot(ox + (x - ox) * f, oz + (z - oz) * f) <= c.rimRadius - c.tubeRadius - radius + 0.006) {
          madeAt = t; hit('net', t); vx *= 0.28; vz *= 0.28;
        }
      }
      if (y < radius) {
        bounce(0, 1, 0, radius - y, 0.54, 'floor', t);
        if (floorAt === null) floorAt = t;
      }
      samples.push([x, y, z]);
      if (floorAt !== null && t - floorAt > 0.30) break;
    }
    return {samples, events, madeAt, duration: (samples.length - 1) * STEP};
  }

  function sample(flight, time, out) {
    const index = clamp(time / STEP, 0, flight.samples.length - 1), i = Math.floor(index);
    const a = flight.samples[i], b = flight.samples[Math.min(i + 1, flight.samples.length - 1)], f = index - i;
    for (let axis = 0; axis < 3; axis++) out[axis] = a[axis] + (b[axis] - a[axis]) * f;
    return out;
  }

  function createMatch(code, generation = 1) {
    return {code, generation, seq: 0, players: [], phase: 'lobby', turn: null, winner: null, shot: null, last: null};
  }
  function player(id, name) { return {id, name, score: 0, ready: false, connected: true}; }
  function allReady(match) { return match.players.length === 2 && match.players.every(p => p.connected && p.ready); }
  function startIfReady(match) {
    if (match.phase === 'lobby' && allReady(match)) {
      match.phase = 'playing'; match.turn = match.players[(match.generation - 1) % 2].id; match.seq++;
    }
  }
  function reset(match) {
    match.generation++; match.seq = 0; match.phase = 'lobby'; match.turn = null;
    match.shot = null; match.last = null; match.winner = null;
    for (const p of match.players) p.score = 0;
  }
  function shoot(match, id, request, now) {
    if (!request || match.phase !== 'playing' || !allReady(match) || match.turn !== id ||
        match.shot || request.generation !== match.generation || request.seq !== match.seq) {
      return {error: 'This shot is no longer available.'};
    }
    if (!validThrow(request.input)) return {error: 'Step back, face the hoop and take another shot.'};
    const input = {origin: request.input.origin.slice(), aim: request.input.aim, power: request.input.power};
    const flight = simulate(input);
    match.shot = {id: match.generation + '/' + match.seq, by: id, input, at: now, duration: flight.duration};
    return {shot: match.shot, made: flight.madeAt !== null};
  }
  function settle(match, result) {
    if (!match.shot || match.shot.id !== result.shot.id || match.shot.by !== result.shot.by) return false;
    const shooter = match.players.find(p => p.id === match.shot.by);
    if (!shooter) return false;
    if (result.made) shooter.score++;
    match.last = {id: match.shot.id, by: shooter.id, made: result.made};
    match.shot = null; match.seq++;
    if (shooter.score >= TARGET) { match.winner = shooter.id; match.phase = 'finished'; match.turn = null; }
    else match.turn = match.players.find(p => p.id !== shooter.id)?.id || null;
    return true;
  }
  return {PROTOCOL, TARGET, COURT, STEP, clamp, validThrow, launch, simulate, sample, createMatch, player, allReady, startIfReady, reset, shoot, settle};
});
