/**
 * game-engine.ts — Pure physics + game-state engine for Ciné-Rush.
 *
 * No DOM access. The component renders by reading the public state and
 * passing it to sprites.ts. Inputs come in via `tick(input)`.
 */

import { PX } from './sprites';
export { PX };

export const TILE = 16;        // base tile size in pixels (matches PX * N grid)
export const GRAVITY = 0.55;   // px/frame²
export const MAX_FALL = 14;    // terminal velocity
export const WALK_ACCEL = 0.45;
export const RUN_ACCEL = 0.7;
export const FRICTION = 0.78;
export const JUMP_VELOCITY = -13;
export const MAX_WALK = 4.5;
export const MAX_RUN = 7;

export interface Vec2 { x: number; y: number; }

/* ----- Level definition ---------------------------------------------- */

export type PlatformKind = 'grass' | 'brick' | 'metal';

/** A solid rectangle the hero can stand on / bonk into. */
export interface Platform {
  x: number; y: number; w: number; h: number; kind: PlatformKind;
}

/** A hazardous car / police car. Moves horizontally on its own. */
export interface Vehicle {
  x: number; y: number; vx: number; kind: 'car' | 'police'; bodyColor: string;
  /** Patrol range (minX, maxX). The car bounces between these bounds. */
  minX: number; maxX: number;
  facing: 1 | -1;
}

/** A collectible ticket (5 = free entry). */
export interface Ticket {
  x: number; y: number; collected: boolean; bob: number;
}

export interface Level {
  name: string;
  /** Total level width in pixels. Camera scrolls up to this. */
  width: number;
  /** Ground height in pixels from top (where the road begins). */
  groundY: number;
  /** Sky gradient stops. */
  skyTop: string;
  skyBot: string;
  platforms: Platform[];
  vehicles: Vehicle[];
  tickets: Ticket[];
  /** Position of the cinema building (top-left, w/h). */
  cinema: { x: number; y: number; w: number; h: number };
  /** Decorative parallax elements (clouds, trees, far buildings). */
  bg: {
    clouds: Array<{ x: number; y: number; scale: number }>;
    farBuildings: Array<{ x: number; y: number; w: number; h: number }>;
    trees: Array<{ x: number; y: number; scale: number }>;
  };
  /** Spawn position of the hero. */
  spawn: Vec2;
}

/* ----- The hero ------------------------------------------------------ */

export interface Hero {
  pos: Vec2;
  vel: Vec2;
  onGround: boolean;
  facing: 1 | -1;
  walking: boolean;
  alive: boolean;
  winTimer: number; // > 0 means "just won" — frozen, fade out
  /** Edge-trigger: set when input.jump was consumed this frame, cleared
   *  after the Y collision pass to skip the spurious "bonk from below"
   *  that would otherwise zero the jump velocity. */
  justJumped: boolean;
  /** Hitbox — slightly smaller than the sprite for fair collisions. */
  bounds: { x: number; y: number; w: number; h: number };
}

/* ----- Input snapshot ---------------------------------------------- */

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  run: boolean;
  start: boolean; // edge-triggered: only fires on the rising edge
  pause: boolean;
}

/* ----- Camera ------------------------------------------------------ */

export interface Camera {
  x: number; y: number;
}

/* ----- Public game state ------------------------------------------ */

export interface GameState {
  status: 'menu' | 'playing' | 'won' | 'dead' | 'paused';
  level: Level;
  hero: Hero;
  camera: Camera;
  score: number;
  ticketsCollected: number;
  totalTickets: number;
  time: number; // seconds elapsed (display)
  /** Pixels scrolled — useful for showing "distance to cinema" HUD. */
  progress: number; // 0 → 1
}

/* ----- Helpers --------------------------------------------------- */

export const makeHero = (spawn: Vec2): Hero => {
  const w = 14 * PX;
  const h = 16 * PX;
  return {
    pos: { ...spawn },
    vel: { x: 0, y: 0 },
    onGround: false,
    facing: 1,
    walking: false,
    alive: true,
    winTimer: 0,
    justJumped: false,
    bounds: { x: spawn.x, y: spawn.y, w, h },
  };
};

export const makeCamera = (): Camera => ({ x: 0, y: 0 });

/**
 * AABB collision between hero and a solid rectangle. Returns the smallest
 * penetration depth on each axis (positive = overlap), or null if no
 * collision. normalX/normalY carry the side of contact (-1 / 0 / 1) so the
 * caller can tell where to push the hero out.
 */
function aabbVsRect(
  hb: { x: number; y: number; w: number; h: number },
  r: { x: number; y: number; w: number; h: number },
): null | { dx: number; dy: number; normalX: number; normalY: number } {
  const ax1 = hb.x, ax2 = hb.x + hb.w;
  const ay1 = hb.y, ay2 = hb.y + hb.h;
  const bx1 = r.x, bx2 = r.x + r.w;
  const by1 = r.y, by2 = r.y + r.h;
  if (ax2 <= bx1 || ax1 >= bx2 || ay2 <= by1 || ay1 >= by2) return null;
  const overlapX = Math.min(ax2 - bx1, bx2 - ax1);
  const overlapY = Math.min(ay2 - by1, by2 - ay1);
  if (overlapX < overlapY) {
    const nx = hb.x + hb.w / 2 < r.x + r.w / 2 ? -1 : 1;
    return { dx: overlapX, dy: 0, normalX: nx, normalY: 0 };
  }
  const ny = hb.y + hb.h / 2 < r.y + r.h / 2 ? -1 : 1;
  return { dx: 0, dy: overlapY, normalX: 0, normalY: ny };
}

/**
 * Step physics for one frame.
 *
 * Order of operations:
 *   1. Read inputs → set horizontal velocity / jump.
 *   2. Apply gravity.
 *   3. Move hero on X, resolve X collisions.
 *   4. Move hero on Y, resolve Y collisions.
 *   5. Move vehicles.
 *   6. Vehicle collision → kill.
 *   7. Tickets → collect on AABB overlap.
 *   8. Camera follow + clamp.
 */
export function tick(state: GameState, input: InputState, dt: number): GameState {
  if (state.status !== 'playing') {
    // still let the win-fade play out
    if (state.status === 'won' && state.hero.winTimer > 0) {
      state.hero.winTimer = Math.max(0, state.hero.winTimer - dt);
    }
    return state;
  }

  const h = state.hero;
  const lvl = state.level;

  /* 1. Input → velocity */
  const accel = input.run ? RUN_ACCEL : WALK_ACCEL;
  const maxSpeed = input.run ? MAX_RUN : MAX_WALK;
  if (input.left && !input.right) {
    h.vel.x -= accel;
    h.facing = -1;
    h.walking = true;
  } else if (input.right && !input.left) {
    h.vel.x += accel;
    h.facing = 1;
    h.walking = true;
  } else {
    h.vel.x *= FRICTION;
    if (Math.abs(h.vel.x) < 0.1) {
      h.vel.x = 0;
      h.walking = false;
    }
  }
  h.vel.x = Math.max(-maxSpeed, Math.min(maxSpeed, h.vel.x));

  if (input.jump && h.onGround) {
    h.vel.y = JUMP_VELOCITY;
    h.onGround = false;
    h.justJumped = true; // skip landing collision this frame — the hero just left the platform
  }

  /* 2. Gravity */
  h.vel.y = Math.min(MAX_FALL, h.vel.y + GRAVITY);

  /* 3. Horizontal move + resolve */
  h.pos.x += h.vel.x;
  h.bounds.x = h.pos.x;
  for (const p of lvl.platforms) {
    const hit = aabbVsRect(h.bounds, p);
    if (!hit) continue;
    if (hit.dx === 0) {
      // Pure vertical penetration — leave it for the Y pass to handle.
      continue;
    }
    // Horizontal push-out
    if (hit.normalX === -1) h.pos.x = p.x - h.bounds.w;
    else h.pos.x = p.x + p.w;
    h.bounds.x = h.pos.x;
    h.vel.x = 0;
  }

  /* 4. Vertical move + resolve */
  h.pos.y += h.vel.y;
  h.bounds.y = h.pos.y;
  h.onGround = false;
  for (const p of lvl.platforms) {
    const hit = aabbVsRect(h.bounds, p);
    if (!hit) continue;
    if (hit.dy === 0) {
      // Pure horizontal penetration — push out horizontally
      if (hit.normalX === -1) h.pos.x = p.x - h.bounds.w;
      else h.pos.x = p.x + p.w;
      h.bounds.x = h.pos.x;
      h.vel.x = 0;
      continue;
    }
    // The collision has a vertical component — prefer landing on top
    // over horizontal push when both axes overlap (otherwise we'd slide
    // off every platform we touch).
    if (hit.normalY === -1) {
      // If we just jumped, we're still inside the platform from the
      // previous frame's landing. Skip the bonk and let the hero leave.
      if (h.justJumped) {
        h.justJumped = false;
        // Re-position above the platform so we don't keep colliding
        h.pos.y = p.y - h.bounds.h - 0.01;
        h.bounds.y = h.pos.y;
        continue;
      }
      h.pos.y = p.y - h.bounds.h;
      h.vel.y = 0;
      h.onGround = true;
    } else {
      h.pos.y = p.y + p.h;
      h.vel.y = 0;
    }
    h.bounds.y = h.pos.y;
  }
  h.justJumped = false; // consumed (or never set)

  /* falling off the world = dead */
  if (h.pos.y > lvl.groundY + 400) {
    h.alive = false;
    state.status = 'dead';
  }

  /* 5. Vehicles */
  for (const v of lvl.vehicles) {
    v.x += v.vx;
    if (v.x <= v.minX) {
      v.x = v.minX;
      v.vx = Math.abs(v.vx);
      v.facing = 1;
    } else if (v.x + 24 * PX >= v.maxX) {
      v.x = v.maxX - 24 * PX;
      v.vx = -Math.abs(v.vx);
      v.facing = -1;
    }
  }

  /* 6. Vehicle collision (hitbox-vs-vehicle) */
  const heroBox = {
    x: h.bounds.x + 2,
    y: h.bounds.y + 4,
    w: h.bounds.w - 4,
    h: h.bounds.h - 4,
  };
  for (const v of lvl.vehicles) {
    const vbox = {
      x: v.x + PX,
      y: v.y + 2 * PX,
      w: 22 * PX,
      h: 12 * PX,
    };
    if (aabbVsRect(heroBox, vbox)) {
      // stomp check: if we're moving down AND above the vehicle's center,
      // it's a stomp — bounce the hero, award nothing (you don't kill
      // civilians, that's not what the brief said).
      if (h.vel.y > 0 && h.bounds.y + h.bounds.h - 6 < v.y + 4 * PX) {
        h.vel.y = JUMP_VELOCITY * 0.7;
        h.pos.y = v.y - h.bounds.h;
        h.bounds.y = h.pos.y;
      } else {
        h.alive = false;
        state.status = 'dead';
      }
      break;
    }
  }

  /* 7. Tickets */
  for (const t of lvl.tickets) {
    if (t.collected) continue;
    t.bob = (t.bob + dt * 4) % (Math.PI * 2);
    const tbox = { x: t.x, y: t.y + Math.sin(t.bob) * 3, w: 12 * PX, h: 12 * PX };
    if (
      heroBox.x < tbox.x + tbox.w &&
      heroBox.x + heroBox.w > tbox.x &&
      heroBox.y < tbox.y + tbox.h &&
      heroBox.y + heroBox.h > tbox.y
    ) {
      t.collected = true;
      state.ticketsCollected += 1;
      state.score += 100;
    }
  }

  /* 8. Camera follow */
  const target = h.pos.x - 360; // viewport width / 2 ≈ 720 / 2
  state.camera.x = Math.max(0, Math.min(lvl.width - 720, target));

  /* 9. Win check — overlap with cinema building */
  const cbox = lvl.cinema;
  if (
    heroBox.x < cbox.x + cbox.w &&
    heroBox.x + heroBox.w > cbox.x &&
    heroBox.y < cbox.y + cbox.h &&
    heroBox.y + heroBox.h > cbox.y
  ) {
    state.status = 'won';
    h.winTimer = 2.5;
    state.score += 500 + state.ticketsCollected * 50;
  }

  /* 10. HUD progress */
  state.progress = Math.max(0, Math.min(1, h.pos.x / lvl.width));

  /* 11. Time */
  state.time += dt;

  return state;
}

/* ----- Restart ---------------------------------------------------- */

export function restart(state: GameState): GameState {
  state.hero = makeHero(state.level.spawn);
  state.status = 'playing';
  state.camera = makeCamera();
  state.score = 0;
  state.ticketsCollected = 0;
  state.time = 0;
  // un-collect tickets
  for (const t of state.level.tickets) {
    t.collected = false;
    t.bob = 0;
  }
  // reset vehicles
  for (const v of state.level.vehicles) {
    v.x = v.minX;
    v.vx = Math.abs(v.vx) || 2;
  }
  return state;
}