import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  signal,
} from '@angular/core';

import {
  GameState,
  Hero,
  InputState,
  Level,
  PX,
  Vehicle,
  makeHero,
  makeCamera,
  restart,
  tick,
} from './game/game-engine';
import { LEVEL_RIVE_GAUCHE } from './game/level';
import {
  drawBuilding,
  drawCar,
  drawCinema,
  drawCloud,
  drawCop,
  drawHero,
  drawPlatform,
  drawPoliceCar,
  drawTicket,
  drawTree,
} from './game/sprites';

/* ----- Component ----------------------------------------------------- */

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <div class="stage" [class.menu]="state().status === 'menu'">
      <canvas
        #cv
        class="game-canvas"
        [width]="viewportW"
        [height]="viewportH"
        (pointerdown)="onPointerDown($event)"></canvas>

      <!-- HUD overlay -->
      @if (state().status === 'playing') {
        <div class="hud">
          <div class="hud-row">
            <div class="hud-pill">🎟️ {{ state().ticketsCollected }} / {{ state().totalTickets }}</div>
            <div class="hud-pill score">⭐ {{ state().score }}</div>
            <div class="hud-pill time">⏱️ {{ formatTime(state().time) }}</div>
          </div>
          <div class="progress-track">
            <div class="progress-fill" [style.width.%]="state().progress * 100"></div>
          </div>
        </div>
      }

      <!-- Menu -->
      @if (state().status === 'menu') {
        <div class="overlay">
          <div class="title-card">
            <h1>CINÉ-RUSH</h1>
            <p class="subtitle">Le marathon vers le cinéma</p>
            <p class="brief">
              Vous avez rendez-vous dans 5 minutes au Gaumont-Parnasse.<br>
              Traversez la rue sans vous faire écraser.<br>
              Esquivez les voitures — et les flics !
            </p>
            <div class="controls-grid">
              <div><kbd>←</kbd><kbd>→</kbd> ou <kbd>A</kbd><kbd>D</kbd></div>
              <div>← courir</div>
              <div><kbd>Espace</kbd> / <kbd>↑</kbd> / <kbd>W</kbd></div>
              <div>← sauter</div>
              <div><kbd>Maj</kbd></div>
              <div>← courir plus vite</div>
              <div><kbd>P</kbd> ou <kbd>Échap</kbd></div>
              <div>← pause</div>
              <div>📱 tactile</div>
              <div>← boutons virtuels</div>
            </div>
            <button class="start-btn" (click)="start()">C'est parti !</button>
            <p class="hint">Ramassez les tickets 🎟️ pour le bonus.</p>
          </div>
        </div>
      }

      <!-- Win -->
      @if (state().status === 'won') {
        <div class="overlay win">
          <div class="title-card">
            <h1>🎬 SÉANCE ATTEINTE !</h1>
            <p class="brief">
              Vous entrez dans le cinéma juste à temps.<br>
              Le film commence dans quelques secondes.
            </p>
            <div class="stats">
              <div>⭐ Score : <strong>{{ state().score }}</strong></div>
              <div>🎟️ Tickets : <strong>{{ state().ticketsCollected }} / {{ state().totalTickets }}</strong></div>
              <div>⏱️ Temps : <strong>{{ formatTime(state().time) }}</strong></div>
            </div>
            <button class="start-btn" (click)="restartGame()">Rejouer</button>
          </div>
        </div>
      }

      <!-- Dead -->
      @if (state().status === 'dead') {
        <div class="overlay dead">
          <div class="title-card">
            <h1>💥 AÏE !</h1>
            <p class="brief">
              Une Clio vous a renversé(e).<br>
              Ou peut-être un taxi. Ou un flic.<br>
              En tout cas, vous avez raté la séance.
            </p>
            <button class="start-btn" (click)="restartGame()">Réessayer</button>
          </div>
        </div>
      }

      <!-- Pause -->
      @if (state().status === 'paused') {
        <div class="overlay">
          <div class="title-card">
            <h1>⏸️ PAUSE</h1>
            <button class="start-btn" (click)="togglePause()">Reprendre</button>
          </div>
        </div>
      }

      <!-- Touch controls (visible on coarse pointers) -->
      @if (showTouch) {
        <div class="touch">
          <button class="tbtn left"  (pointerdown)="setKey('left', true)"  (pointerup)="setKey('left', false)"  (pointercancel)="setKey('left', false)">◀</button>
          <button class="tbtn jump"  (pointerdown)="setKey('jump', true)"  (pointerup)="setKey('jump', false)"  (pointercancel)="setKey('jump', false)">▲</button>
          <button class="tbtn right" (pointerdown)="setKey('right', true)" (pointerup)="setKey('right', false)" (pointercancel)="setKey('right', false)">▶</button>
        </div>
      }
    </div>
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cv', { static: true }) cv!: ElementRef<HTMLCanvasElement>;

  /* ----- public, exposed to HUD ----------------------------------- */
  protected readonly viewportW = 720;
  protected readonly viewportH = 480;
  protected readonly state = signal<GameState>(this.buildInitialState());

  /* ----- input state -------------------------------------------- */
  private input: InputState = {
    left: false,
    right: false,
    jump: false,
    run: false,
    start: false,
    pause: false,
  };
  private jumpBuffered = false;
  private prevJump = false;

  /* ----- animation loop ---------------------------------------- */
  private rafId: number | null = null;
  private lastFrame = 0;
  protected showTouch = false;

  ngAfterViewInit(): void {
    // detect touch-only devices (cheap heuristic)
    this.showTouch =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(pointer: coarse)').matches;

    // resize canvas to fill its container while preserving aspect ratio
    this.fitCanvas();
    window.addEventListener('resize', this.fitCanvas);

    // start the loop
    this.lastFrame = performance.now();
    this.loop(this.lastFrame);
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.fitCanvas);
  }

  /* ----- initial state ------------------------------------------- */
  private buildInitialState(): GameState {
    const level: Level = LEVEL_RIVE_GAUCHE;
    const hero: Hero = makeHero(level.spawn);
    return {
      status: 'menu',
      level,
      hero,
      camera: makeCamera(),
      score: 0,
      ticketsCollected: 0,
      totalTickets: level.tickets.length,
      time: 0,
      progress: 0,
    };
  }

  /* ----- canvas sizing ------------------------------------------ */
  private fitCanvas = (): void => {
    if (!this.cv) return;
    const c = this.cv.nativeElement;
    const parent = c.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const ratio = this.viewportW / this.viewportH;
    let w = rect.width;
    let h = rect.width / ratio;
    if (h > rect.height) {
      h = rect.height;
      w = h * ratio;
    }
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    // draw the static menu background once after resize
    this.render(0);
  };

  /* ----- main loop ---------------------------------------------- */
  private loop = (now: number): void => {
    const dt = Math.min(0.033, (now - this.lastFrame) / 1000); // cap at 30 fps step
    this.lastFrame = now;

    // Edge detection: only fire "jump" on the rising edge
    if (this.input.jump && !this.prevJump) this.jumpBuffered = true;
    this.prevJump = this.input.jump;
    if (this.jumpBuffered && this.state().status === 'playing') {
      // buffer is consumed by tick()
    }
    const input: InputState = {
      ...this.input,
      jump: this.jumpBuffered,
    };

    // clone state (mutations stay in tick)
    const prev = this.state();
    const next = tick(structuredCloneShallow(prev), input, dt);
    if (this.jumpBuffered && next.hero.onGround === false) {
      // already consumed by tick — clear so we don't double-jump
    }
    if (input.jump) this.jumpBuffered = false;

    this.state.set(next);

    // draw
    this.render(now);

    this.rafId = requestAnimationFrame(this.loop);
  };

  /* ----- rendering ---------------------------------------------- */
  private render(_now: number): void {
    const c = this.cv.nativeElement;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const s = this.state();

    // Sky
    const grad = ctx.createLinearGradient(0, 0, 0, this.viewportH);
    grad.addColorStop(0, s.level.skyTop);
    grad.addColorStop(1, s.level.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.viewportW, this.viewportH);

    // parallax clouds (slowest)
    ctx.save();
    ctx.translate(-s.camera.x * 0.2, 0);
    for (const cl of s.level.bg.clouds) {
      drawCloud(ctx, cl.x, cl.y, cl.scale);
    }
    ctx.restore();

    // far buildings
    ctx.save();
    ctx.translate(-s.camera.x * 0.5, 0);
    for (const b of s.level.bg.farBuildings) {
      drawBuilding(ctx, b.x, b.y, b.w, b.h);
    }
    ctx.restore();

    // trees
    ctx.save();
    ctx.translate(-s.camera.x * 0.85, 0);
    for (const t of s.level.bg.trees) {
      drawTree(ctx, t.x, t.y, t.scale);
    }
    ctx.restore();

    // main scene
    ctx.save();
    ctx.translate(-s.camera.x, 0);

    // platforms
    for (const p of s.level.platforms) {
      drawPlatform(ctx, p.x, p.y, p.w, p.h, p.kind);
    }

    // tickets
    let frame: 0 | 1 = ((performance.now() / 250) | 0) % 2 === 0 ? 0 : 1;
    for (const t of s.level.tickets) {
      if (t.collected) continue;
      drawTicket(ctx, t.x, t.y + Math.sin(t.bob) * 3, frame);
    }

    // cinema (only draw when visible)
    const cinema = s.level.cinema;
    if (
      cinema.x + cinema.w > s.camera.x - 100 &&
      cinema.x < s.camera.x + this.viewportW + 100
    ) {
      drawCinema(ctx, cinema.x, cinema.y, cinema.w, cinema.h);
    }

    // vehicles
    for (const v of s.level.vehicles) {
      if (v.kind === 'police') {
        drawPoliceCar(ctx, v.x, v.y, v.facing);
        // little cop NPC visible through the windscreen (just for fun)
        if (s.hero.pos.x < v.x) {
          drawCop(ctx, v.x + 8 * PX, v.y + 2 * PX, -1);
        } else {
          drawCop(ctx, v.x + 8 * PX, v.y + 2 * PX, 1);
        }
      } else {
        drawCar(ctx, v.x, v.y, v.facing, v.bodyColor);
      }
    }

    // hero
    drawHero(ctx, s.hero.pos.x, s.hero.pos.y, {
      walking: s.hero.walking,
      facing: s.hero.facing,
    });

    ctx.restore();

    // win fade-out
    if (s.status === 'won' && s.hero.winTimer > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.85, (2.5 - s.hero.winTimer) * 0.6)})`;
      ctx.fillRect(0, 0, this.viewportW, this.viewportH);
    }

    if (s.status === 'dead') {
      ctx.fillStyle = 'rgba(120, 0, 0, 0.4)';
      ctx.fillRect(0, 0, this.viewportW, this.viewportH);
    }
  }

  /* ----- input plumbing ----------------------------------------- */
  protected start(): void {
    const s = this.state();
    s.status = 'playing';
    this.state.set({ ...s });
  }

  protected restartGame(): void {
    const s = restart(structuredCloneShallow(this.state()));
    this.state.set(s);
  }

  protected togglePause(): void {
    const s = this.state();
    if (s.status === 'playing') s.status = 'paused';
    else if (s.status === 'paused') s.status = 'playing';
    this.state.set({ ...s });
  }

  protected setKey(key: 'left' | 'right' | 'jump', value: boolean): void {
    this.input[key] = value;
  }

  /* ----- keyboard handlers -------------------------------------- */
  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(ev: KeyboardEvent): void {
    if (ev.repeat) return;
    switch (ev.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
      case 'q':
      case 'Q':
        this.input.left = true;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.input.right = true;
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
      case 'z':
      case 'Z':
      case ' ':
        this.input.jump = true;
        break;
      case 'Shift':
        this.input.run = true;
        break;
      case 'p':
      case 'P':
      case 'Escape':
        this.togglePause();
        break;
      case 'Enter':
        if (this.state().status === 'menu') this.start();
        break;
    }
  }

  @HostListener('window:keyup', ['$event'])
  protected onKeyUp(ev: KeyboardEvent): void {
    switch (ev.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
      case 'q':
      case 'Q':
        this.input.left = false;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.input.right = false;
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
      case 'z':
      case 'Z':
      case ' ':
        this.input.jump = false;
        break;
      case 'Shift':
        this.input.run = false;
        break;
    }
  }

  /* ----- pointer ------------------------------------------------- */
  protected onPointerDown(_ev: PointerEvent): void {
    if (this.state().status === 'menu') this.start();
  }

  /* ----- helpers ------------------------------------------------- */
  protected formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}

/**
 * Cheap shallow clone for the immutable-update pattern in tick(). The engine
 * mutates nested state (vehicles, tickets) — cloning the top level avoids
 * surprising reactivity artifacts and lets Angular detect the change via
 * signal `.set()`.
 */
function structuredCloneShallow<T>(obj: T): T {
  // hand-rolled shallow clone that handles our specific shape (no Maps, no
  // Dates, no functions in data). Engine mutates only nested `level`,
  // `hero`, `camera` — those are the ones we need to deep-copy.
  if (obj === null || typeof obj !== 'object') return obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = structuredCloneShallow(v);
    } else if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        item && typeof item === 'object' ? structuredCloneShallow(item) : item,
      );
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

// Avoid "imported but unused" complaints about Vehicle — kept around as a
// type reference for future expansion.
export type { Vehicle };