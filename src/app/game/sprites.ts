/**
 * sprites.ts — pixel-art drawing routines.
 *
 * Every sprite is rendered procedurally on the canvas using small "pixel"
 * rectangles (no external assets). This keeps the bundle self-contained and
 * gives us full control over an authentic SNES/SMW look: chunky 2-3 px
 * squares, hard outlines, saturated palette.
 *
 * Conventions used in the routines below:
 *  - drawXxx(ctx, x, y) places the sprite's TOP-LEFT corner at (x, y).
 *  - Internal pixel size is `PX` (typically 2). Increasing PX scales the sprite.
 *  - Every call uses `ctx.fillRect(x + col*PX, y + row*PX, PX, PX)`.
 *  - Palettes are local constants — no shared state.
 */

export const PX = 3; // base pixel size — sprites look sharp at integer multiples

/* ----- palette helpers ------------------------------------------------- */

type RGB = [number, number, number];
const c = (ctx: CanvasRenderingContext2D, color: string) => {
  ctx.fillStyle = color;
};

const px = (ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number, color: string) => {
  c(ctx, color);
  ctx.fillRect(x + col * PX, y + row * PX, PX, PX);
};

/* ----- Mario-style hero (the protagonist) ----------------------------- */
/*
   16x16 sprite. Red cap, blue overalls, brown shoes, white gloves.
   `walking` toggles the legs; `facing` flips horizontally.
*/

export interface HeroSpriteOpts {
  walking: boolean; // false = standing
  facing: 1 | -1;  // 1 = right, -1 = left
}

export function drawHero(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  opts: HeroSpriteOpts,
): void {
  const RED = '#e22929';
  const RED_DARK = '#a31515';
  const SKIN = '#f3b48a';
  const SKIN_DARK = '#b87758';
  const BROWN = '#5a2b0c';
  const BLUE = '#1e4ec5';
  const BLUE_DARK = '#0f2e85';
  const WHITE = '#ffffff';
  const BLACK = '#000000';
  const YELLOW = '#f5c542';

  // 16x16 grid (row 0 = top)
  // ' ' = transparent, other letters = colours
  const standing = [
    '      RRRRRR    ',
    '     RRRRRRRR   ',
    '    RRRRYRRRR   ',
    '    SSYYY SS     ',
    '    SSYSSSS     ',
    '    SS SSSS     ',
    '      BBB       ',
    '     BWWWB      ',
    '    BBWWWWBB    ',
    '    B BWBWB     ',
    '    BDDBWWB     ',
    '   BDDDBWBB     ',
    '   BBBBBBBB     ',
    '    BB  BB      ',
    '   BBB  BBB     ',
    '   BBB  BBB     ',
  ];

  const walking = [
    '      RRRRRR    ',
    '     RRRRRRRR   ',
    '    RRRRYRRRR   ',
    '    SSYYY SS     ',
    '    SSYSSSS     ',
    '    SS SSSS     ',
    '      BBB       ',
    '     BWWWB      ',
    '    BBWWWWBB    ',
    '    B BWBWB     ',
    '    BDDBWWB     ',
    '   BDDDBWBB     ',
    '   BBBBBBBB     ',
    '    BB  BBB     ',
    '   BBB   BBB    ',
    '   BBB          ',
  ];

  const grid = opts.walking ? walking : standing;
  const w = 16 * PX;
  const h = 16 * PX;

  ctx.save();
  if (opts.facing === -1) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    x = 0;
    y = 0;
  }

  for (let row = 0; row < grid.length; row++) {
    const line = grid[row]!;
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      let colour: string | null = null;
      switch (ch) {
        case 'R': colour = RED; break;
        case 'Y': colour = YELLOW; break;
        case 'S': colour = SKIN; break;
        case 'B': colour = BLUE; break;
        case 'D': colour = BLUE_DARK; break;
        case 'W': colour = WHITE; break;
        case 'K': colour = BROWN; break;
        default: continue;
      }
      px(ctx, x, y, col, row, colour);
    }
  }

  // hard outline for the SMW look
  c(ctx, '#000000');
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);

  ctx.restore();
}

/* ----- Police car ------------------------------------------------------ */
/*
   24x16 sprite. Black-and-white retro sedan with a red/blue light bar.
*/

export function drawPoliceCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: 1 | -1,
): void {
  const WHITE = '#ffffff';
  const BLACK = '#000000';
  const GREY = '#3a3a3a';
  const RED = '#e22929';
  const BLUE = '#2a72e0';
  const WINDOW = '#9ec9f5';

  const grid = [
    '                        ',
    '       WWWWWWWWWW       ',
    '     WWWWWWWWWWWWWW     ',
    '    WWBBBBBBBBBBBBWW    ',
    '   WWBBBBBBBBBBBBBBWW   ',
    '  WWBBBBBBBBBBBBBBBBWW  ',
    '  WWKWWWWWWWWWWWWWWKWW  ',
    '  WWKWWWWWWWWWWWWWWKWW  ',
    ' WWKKKWWBBBBBBBBWWKKKWW ',
    ' WWKKKWWBBBBBBBBWWKKKWW ',
    ' WWKKKWWBBBBBBBBWWKKKWW ',
    'WWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWW',
    'WKKKKKKKKKKKKKKKKKKKKKKW',
    'WKWKKKKKKKKKKKKKKKKKWKW ',
    ' K K                K K ',
  ];

  const w = 24 * PX;
  const h = 16 * PX;

  ctx.save();
  if (facing === -1) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    x = 0;
    y = 0;
  }

  for (let row = 0; row < grid.length; row++) {
    const line = grid[row]!;
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      let colour: string | null = null;
      switch (ch) {
        case 'W': colour = WHITE; break;
        case 'K': colour = BLACK; break;
        case 'G': colour = GREY; break;
        case 'R': colour = RED; break;
        case 'B': colour = BLUE; break;
        case 'V': colour = WINDOW; break;
        default: continue;
      }
      px(ctx, x, y, col, row, colour);
    }
  }

  // light bar (alternating red/blue) — flicker handled by caller
  const t = (Date.now() / 200) | 0;
  const lightColor = t % 2 === 0 ? RED : BLUE;
  c(ctx, lightColor);
  ctx.fillRect(x + 8 * PX, y + 3 * PX, 8 * PX, PX);

  ctx.restore();
}

/* ----- Civilian car --------------------------------------------------- */
/*
   24x16 sprite. Generic sedan, colour parameterised.
*/

export function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: 1 | -1,
  bodyColor: string,
  windowColor = '#9ec9f5',
): void {
  const BLACK = '#000000';
  const WHITE = '#ffffff';
  const headlightColor = '#fff7a8';

  const grid = [
    '                        ',
    '       WWWWWWWWWW       ',
    '     WWWWWWWWWWWWWW     ',
    '    WWBBBBBBBBBBBBWW    ',
    '   WWBBBBBBBBBBBBBBWW   ',
    '  WWBBBBBBBBBBBBBBBBWW  ',
    '  WWWWWWWWWWWWWWWWWWWW  ',
    '  WWWWWWWWWWWWWWWWWWWW  ',
    ' WWWWWWBBBBBBBBWWWWWWWW ',
    ' WWWWWWBBBBBBBBWWWWWWWW ',
    ' WWWWWWBBBBBBBBWWWWWWWW ',
    'WWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWW',
    'WKKKKKKKKKKKKKKKKKKKKKKW',
    'WKWKKKKKKKKKKKKKKKKKWKW ',
    ' K K                K K ',
  ];

  const w = 24 * PX;
  const h = 16 * PX;

  ctx.save();
  if (facing === -1) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    x = 0;
    y = 0;
  }

  for (let row = 0; row < grid.length; row++) {
    const line = grid[row]!;
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      let colour: string | null = null;
      switch (ch) {
        case 'W': colour = WHITE; break;
        case 'K': colour = BLACK; break;
        case 'B': colour = bodyColor; break;
        case 'V': colour = windowColor; break;
        default: continue;
      }
      px(ctx, x, y, col, row, colour);
    }
  }

  // headlights (yellow rectangles at the front)
  c(ctx, headlightColor);
  if (facing === 1) {
    ctx.fillRect(x + 22 * PX, y + 11 * PX, PX, PX);
  } else {
    ctx.fillRect(x, y + 11 * PX, PX, PX);
  }

  ctx.restore();
}

/* ----- Standing cop NPC (driving the police car) --------------------- */
/*
   8x16 hatch to a uniformed officer. We don't actually need this since the
   police car is the hazard — kept here as a future sprite (e.g. for
   pedestrians).
*/

export function drawCop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: 1 | -1,
): void {
  const SKIN = '#f3b48a';
  const BLUE = '#1e4ec5';
  const BLUE_DARK = '#0f2e85';
  const BLACK = '#000000';
  const HAT = '#0a1d4a';

  const grid = [
    '  HHHHH  ',
    ' HHHHHHH ',
    ' HHHHHHH ',
    '  HHHHH  ',
    ' HHHHHHH ',
    'HHSHSSHH ',
    'HSKSSSSK ',
    'HSKSSSSK ',
    ' BBBBBB  ',
    'BBBBBBBB ',
    ' BBBBBB  ',
    ' BBBBBB  ',
    ' BB  BB  ',
    'BBB  BBB ',
    'BBB  BBB ',
    ' D    D  ',
  ];

  const w = 8 * PX;
  const h = 16 * PX;

  ctx.save();
  if (facing === -1) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    x = 0;
    y = 0;
  }

  for (let row = 0; row < grid.length; row++) {
    const line = grid[row]!;
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      let colour: string | null = null;
      switch (ch) {
        case 'H': colour = HAT; break;
        case 'S': colour = SKIN; break;
        case 'K': colour = BLACK; break;
        case 'B': colour = BLUE; break;
        case 'D': colour = BLUE_DARK; break;
        default: continue;
      }
      px(ctx, x, y, col, row, colour);
    }
  }

  c(ctx, BLACK);
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);

  ctx.restore();
}

/* ----- Coin / ticket (collectible) ---------------------------------- */
export function drawTicket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: 0 | 1,
): void {
  const YELLOW = '#ffd84a';
  const DARK = '#b9851f';
  const RED = '#c83232';

  const w = 12 * PX;
  const h = 12 * PX;

  c(ctx, YELLOW);
  ctx.fillRect(x + 2 * PX, y + 1 * PX, 8 * PX, 10 * PX);
  c(ctx, DARK);
  ctx.fillRect(x + 2 * PX, y + 1 * PX, 8 * PX, PX);
  ctx.fillRect(x + 2 * PX, y + 10 * PX, 8 * PX, PX);
  ctx.fillRect(x + 2 * PX, y + 1 * PX, PX, 10 * PX);
  ctx.fillRect(x + 9 * PX, y + 1 * PX, PX, 10 * PX);

  // perforation strip in the middle
  c(ctx, RED);
  const offset = frame === 0 ? 0 : PX;
  ctx.fillRect(x + 2 * PX, y + 5 * PX + offset, 8 * PX, PX);
  c(ctx, '#ffffff');
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x + (3 + i * 2) * PX, y + 5 * PX + offset, PX, PX);
  }
  c(ctx, '#000000');
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
}

/* ----- Cinema building (level goal) -------------------------------- */
export function drawCinema(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const facade = '#7a1a1a';
  const facadeDark = '#4d0d0d';
  const trim = '#ffd84a';
  const awning = '#c83232';
  const window = '#ffe89a';

  // facade
  c(ctx, facade);
  ctx.fillRect(x, y + 8 * PX, w, h - 8 * PX);

  // roof line
  c(ctx, facadeDark);
  ctx.fillRect(x, y + 8 * PX, w, PX);

  // columns
  const colW = 6 * PX;
  for (let cx = x + 4 * PX; cx < x + w - 4 * PX; cx += 12 * PX) {
    c(ctx, trim);
    ctx.fillRect(cx, y + 10 * PX, colW, h - 12 * PX);
  }

  // marquee (top sign)
  c(ctx, facadeDark);
  ctx.fillRect(x, y, w, 7 * PX);
  c(ctx, trim);
  ctx.fillRect(x, y + 6 * PX, w, PX);

  // marquee text background
  c(ctx, '#000000');
  ctx.fillRect(x + 4 * PX, y + PX, w - 8 * PX, 4 * PX);

  // marquee bulbs (alternating)
  for (let i = 0; i < 16; i++) {
    c(ctx, i % 2 === 0 ? '#ffffff' : trim);
    ctx.fillRect(x + (2 + i * 4) * PX, y, 2 * PX, PX);
  }

  // awning
  c(ctx, awning);
  ctx.fillRect(x, y + 8 * PX, w, 4 * PX);
  c(ctx, '#ffffff');
  for (let i = 0; i < 16; i++) {
    if (i % 2 === 0) ctx.fillRect(x + (i * 4) * PX, y + 8 * PX, 2 * PX, 4 * PX);
  }

  // entrance (door)
  const doorW = 10 * PX;
  const doorX = x + (w - doorW) / 2;
  const doorY = y + h - 22 * PX;
  c(ctx, '#1a0a0a');
  ctx.fillRect(doorX, doorY, doorW, 22 * PX);
  c(ctx, window);
  ctx.fillRect(doorX + PX, doorY + PX, doorW - 2 * PX, 8 * PX);

  // 'CINÉMA' sign text (faux pixel letters)
  c(ctx, '#ffffff');
  ctx.font = `${4 * PX}px Courier New`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CINÉMA', x + w / 2, y + 4 * PX);

  // hard outline
  c(ctx, '#000000');
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
}

/* ----- Floating platform (the classic SMW question-block silhouette) ----- */
export function drawPlatform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  kind: 'grass' | 'brick' | 'metal',
): void {
  if (kind === 'grass') {
    c(ctx, '#00a040');
    ctx.fillRect(x, y, w, PX);
    c(ctx, '#7a3e10');
    ctx.fillRect(x, y + PX, w, h - PX);
    // brick pattern
    c(ctx, '#5a2b0c');
    for (let row = PX * 2; row < h; row += PX * 3) {
      ctx.fillRect(x, y + row, w, PX);
    }
    c(ctx, '#000000');
    ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  } else if (kind === 'brick') {
    c(ctx, '#c97e3a');
    ctx.fillRect(x, y, w, h);
    c(ctx, '#000000');
    ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
    for (let row = 0; row < h; row += PX * 3) {
      ctx.fillRect(x, y + row, w, PX);
    }
    const off = (row: number) => ((row / PX) | 0) % 6 < 3 ? 0 : PX * 4;
    for (let row = 0; row < h; row += PX * 3) {
      ctx.fillRect(x + off(row), y + row, PX, PX * 3);
      ctx.fillRect(x + off(row) + PX * 4, y + row, PX, PX * 3);
    }
  } else {
    // metal
    c(ctx, '#a8a8b8');
    ctx.fillRect(x, y, w, h);
    c(ctx, '#000000');
    ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
    c(ctx, '#5a5a6a');
    for (let row = 0; row < h; row += PX * 2) {
      ctx.fillRect(x, y + row, w, PX);
    }
  }
}

/* ----- Background clouds / buildings (parallax layers) ----------------- */

export function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1): void {
  const W = '#ffffff';
  c(ctx, W);
  const r = PX * scale;
  ctx.fillRect(x + 4 * r, y, 10 * r, 4 * r);
  ctx.fillRect(x + 2 * r, y + 4 * r, 14 * r, 4 * r);
  ctx.fillRect(x + 4 * r, y + 8 * r, 10 * r, 4 * r);
}

export function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1): void {
  const r = PX * scale;
  // trunk
  c(ctx, '#5a2b0c');
  ctx.fillRect(x + 4 * r, y + 6 * r, 2 * r, 4 * r);
  // leaves
  c(ctx, '#00a040');
  ctx.fillRect(x + 2 * r, y, 6 * r, 6 * r);
  c(ctx, '#006020');
  ctx.fillRect(x + 2 * r, y + 5 * r, 6 * r, r);
}

export function drawBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const facade = '#c8b89a';
  const dark = '#8a7860';
  const window = '#9ec9f5';
  c(ctx, facade);
  ctx.fillRect(x, y, w, h);
  c(ctx, dark);
  ctx.fillRect(x, y, w, PX);
  // windows
  for (let row = PX * 2; row < h; row += PX * 4) {
    for (let col = PX * 2; col < w; col += PX * 4) {
      c(ctx, window);
      ctx.fillRect(x + col, y + row, 2 * PX, 3 * PX);
    }
  }
  c(ctx, '#000000');
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
}