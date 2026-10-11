/**
 * level.ts — Level 1: "Rive Gauche Express".
 *
 * The player must cross a busy Parisian boulevard and reach the cinema
 * before being hit by cars or police vehicles. Layout:
 *
 *   - Sky / buildings / clouds (parallax layers)
 *   - Road (the hazard zone)
 *   - Sidewalks and floating platforms (safe zones, optional collectibles)
 *   - Cinema building at the far right
 */

import type { Level } from './game-engine';
import { PX } from './sprites';

const T = 16 * PX; // tile = 48px

export const LEVEL_RIVE_GAUCHE: Level = {
  name: 'Rive Gauche Express',
  width: 80 * T,                 // ≈ 3840px (≈ 5+ screens)
  groundY: 24 * T,               // road starts ~720px from top
  skyTop: '#5c94fc',
  skyBot: '#bce0ff',

  platforms: [
    // ground (the road level, full width except gaps)
    { x: 0,             y: 24 * T, w: 24 * T, h: 6 * T, kind: 'grass' },
    { x: 25 * T,        y: 24 * T, w: 18 * T, h: 6 * T, kind: 'grass' },
    { x: 44 * T,        y: 24 * T, w: 16 * T, h: 6 * T, kind: 'grass' },
    { x: 61 * T,        y: 24 * T, w: 19 * T, h: 6 * T, kind: 'grass' },

    // floating platforms (some over the road — jump pads to dodge cars)
    { x: 8 * T,   y: 20 * T, w: 4 * T, h: T, kind: 'brick' },
    { x: 14 * T,  y: 17 * T, w: 4 * T, h: T, kind: 'brick' },
    { x: 20 * T,  y: 20 * T, w: 4 * T, h: T, kind: 'brick' },

    // raised sidewalks in the middle of the road (refuges)
    { x: 30 * T,  y: 21 * T, w: 3 * T, h: T, kind: 'metal' },
    { x: 36 * T,  y: 22 * T, w: 3 * T, h: T, kind: 'metal' },

    // platforms near the cinema entrance
    { x: 50 * T,  y: 20 * T, w: 4 * T, h: T, kind: 'brick' },
    { x: 56 * T,  y: 18 * T, w: 4 * T, h: T, kind: 'brick' },
    { x: 62 * T,  y: 16 * T, w: 4 * T, h: T, kind: 'brick' },
    { x: 68 * T,  y: 14 * T, w: 4 * T, h: T, kind: 'brick' },
    { x: 72 * T,  y: 18 * T, w: 4 * T, h: T, kind: 'brick' },

    // ceiling (so jumping too high doesn't fly off)
    { x: 0, y: 0, w: 80 * T, h: 4 * T, kind: 'grass' },
  ],

  vehicles: [
    // First stretch — sparse cars, low speed
    { x: 4 * T,  y: 24 * T - 14 * PX, vx: 2.5, kind: 'car',    bodyColor: '#e2c64a', minX: 0,   maxX: 24 * T, facing: 1 },
    { x: 12 * T, y: 24 * T - 14 * PX, vx: -2.8, kind: 'car',   bodyColor: '#5fa83a', minX: 0,   maxX: 24 * T, facing: -1 },
    { x: 18 * T, y: 24 * T - 14 * PX, vx: 3.2, kind: 'police', bodyColor: '#ffffff', minX: 0,   maxX: 24 * T, facing: 1 },

    // Second stretch — heavier traffic
    { x: 27 * T, y: 24 * T - 14 * PX, vx: 4,    kind: 'car',    bodyColor: '#c83232', minX: 25 * T, maxX: 43 * T, facing: 1 },
    { x: 32 * T, y: 24 * T - 14 * PX, vx: -3.5, kind: 'car',    bodyColor: '#1e4ec5', minX: 25 * T, maxX: 43 * T, facing: -1 },
    { x: 38 * T, y: 24 * T - 14 * PX, vx: 4.2,  kind: 'car',    bodyColor: '#a35a2a', minX: 25 * T, maxX: 43 * T, facing: 1 },
    { x: 41 * T, y: 24 * T - 14 * PX, vx: -3.8, kind: 'police', bodyColor: '#ffffff', minX: 25 * T, maxX: 43 * T, facing: -1 },

    // Third stretch — fastest, two police cars
    { x: 47 * T, y: 24 * T - 14 * PX, vx: 5.2,  kind: 'car',    bodyColor: '#5a2b8a', minX: 44 * T, maxX: 60 * T, facing: 1 },
    { x: 52 * T, y: 24 * T - 14 * PX, vx: -4.6, kind: 'car',    bodyColor: '#e29c2a', minX: 44 * T, maxX: 60 * T, facing: -1 },
    { x: 56 * T, y: 24 * T - 14 * PX, vx: 5.8,  kind: 'police', bodyColor: '#ffffff', minX: 44 * T, maxX: 60 * T, facing: 1 },

    // Final stretch — calmer, but the cinema is just ahead
    { x: 65 * T, y: 24 * T - 14 * PX, vx: 3.2,  kind: 'car',    bodyColor: '#3aa89a', minX: 61 * T, maxX: 80 * T, facing: 1 },
    { x: 71 * T, y: 24 * T - 14 * PX, vx: -2.8, kind: 'car',    bodyColor: '#a8325a', minX: 61 * T, maxX: 80 * T, facing: -1 },
    { x: 75 * T, y: 24 * T - 14 * PX, vx: 4.0,  kind: 'police', bodyColor: '#ffffff', minX: 61 * T, maxX: 80 * T, facing: 1 },
  ],

  tickets: [
    { x:  9 * T, y: 18 * T, collected: false, bob: 0 },
    { x: 15 * T, y: 15 * T, collected: false, bob: 0 },
    { x: 21 * T, y: 18 * T, collected: false, bob: 0 },
    { x: 31 * T, y: 19 * T, collected: false, bob: 0 },
    { x: 37 * T, y: 20 * T, collected: false, bob: 0 },
    { x: 51 * T, y: 18 * T, collected: false, bob: 0 },
    { x: 57 * T, y: 16 * T, collected: false, bob: 0 },
    { x: 63 * T, y: 14 * T, collected: false, bob: 0 },
    { x: 69 * T, y: 12 * T, collected: false, bob: 0 },
    { x: 73 * T, y: 16 * T, collected: false, bob: 0 },
  ],

  cinema: {
    x: 74 * T,
    y: 14 * T,
    w: 6 * T,
    h: 10 * T,
  },

  bg: {
    clouds: [
      { x: 4 * T,  y: 3 * T, scale: 1 },
      { x: 14 * T, y: 2 * T, scale: 1.3 },
      { x: 26 * T, y: 4 * T, scale: 1 },
      { x: 38 * T, y: 2 * T, scale: 1.1 },
      { x: 50 * T, y: 3 * T, scale: 1 },
      { x: 62 * T, y: 4 * T, scale: 1.2 },
    ],
    farBuildings: [
      { x:  2 * T, y: 8 * T, w: 5 * T, h: 14 * T },
      { x:  9 * T, y: 10 * T, w: 4 * T, h: 12 * T },
      { x: 18 * T, y: 7 * T, w: 6 * T, h: 15 * T },
      { x: 28 * T, y: 9 * T, w: 5 * T, h: 13 * T },
      { x: 36 * T, y: 8 * T, w: 4 * T, h: 14 * T },
      { x: 44 * T, y: 10 * T, w: 5 * T, h: 12 * T },
      { x: 54 * T, y: 8 * T, w: 6 * T, h: 14 * T },
      { x: 64 * T, y: 9 * T, w: 5 * T, h: 13 * T },
      { x: 72 * T, y: 8 * T, w: 4 * T, h: 14 * T },
    ],
    trees: [
      { x:  6 * T, y: 23 * T, scale: 1 },
      { x: 17 * T, y: 23 * T, scale: 1.1 },
      { x: 29 * T, y: 23 * T, scale: 1 },
      { x: 42 * T, y: 23 * T, scale: 1.2 },
      { x: 56 * T, y: 23 * T, scale: 1 },
      { x: 68 * T, y: 23 * T, scale: 1 },
    ],
  },

  spawn: { x: 2 * T, y: 22 * T },
};