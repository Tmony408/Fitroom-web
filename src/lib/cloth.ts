// Real-time cloth simulation (Verlet spring-mass), framework-free so the physics
// is unit-testable. A grid of particles falls under gravity, distance
// constraints keep the weave together, and sphere colliders (the body) make the
// cloth drape over the torso. Not photorealistic — it's a genuine real-time
// physics sim that the 3D preview renders each frame.

export interface Sphere { x: number; y: number; z: number; r: number }

interface Constraint { a: number; b: number; rest: number }

export class ClothSim {
  readonly cols: number;
  readonly rows: number;
  readonly count: number;
  readonly pos: Float32Array;   // x,y,z per particle
  readonly prev: Float32Array;
  readonly pinned: Uint8Array;  // 1 = fixed
  private readonly constraints: Constraint[] = [];

  /** Build a sheet of `cols`×`rows` particles, top-left at (ox,oy,oz). */
  constructor(cols: number, rows: number, spacing: number, ox: number, oy: number, oz: number) {
    this.cols = cols; this.rows = rows; this.count = cols * rows;
    this.pos = new Float32Array(this.count * 3);
    this.prev = new Float32Array(this.count * 3);
    this.pinned = new Uint8Array(this.count);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 3;
        this.pos[i] = ox + c * spacing;
        this.pos[i + 1] = oy - r * spacing;
        this.pos[i + 2] = oz;
      }
    }
    this.prev.set(this.pos);

    const add = (a: number, b: number) => {
      const dx = this.pos[a * 3] - this.pos[b * 3];
      const dy = this.pos[a * 3 + 1] - this.pos[b * 3 + 1];
      const dz = this.pos[a * 3 + 2] - this.pos[b * 3 + 2];
      this.constraints.push({ a, b, rest: Math.hypot(dx, dy, dz) });
    };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (c < cols - 1) add(idx, idx + 1);          // structural →
        if (r < rows - 1) add(idx, idx + cols);       // structural ↓
        if (c < cols - 2) add(idx, idx + 2);          // bend → (stiffness)
        if (r < rows - 2) add(idx, idx + 2 * cols);   // bend ↓
      }
    }
  }

  pin(index: number) { this.pinned[index] = 1; }
  pinTopRow() { for (let c = 0; c < this.cols; c++) this.pin(c); }

  /** Advance one step: integrate, satisfy constraints, resolve collisions. */
  step(dt: number, gravityY: number, colliders: Sphere[] = [], iterations = 3) {
    const damping = 0.98;
    const g = gravityY * dt * dt;
    for (let p = 0; p < this.count; p++) {
      if (this.pinned[p]) continue;
      const i = p * 3;
      for (let k = 0; k < 3; k++) {
        const cur = this.pos[i + k];
        const vel = (cur - this.prev[i + k]) * damping;
        this.prev[i + k] = cur;
        this.pos[i + k] = cur + vel + (k === 1 ? g : 0);
      }
    }
    for (let it = 0; it < iterations; it++) {
      this.satisfyConstraints();
      this.collide(colliders);
    }
  }

  private satisfyConstraints() {
    for (const con of this.constraints) {
      const ai = con.a * 3, bi = con.b * 3;
      let dx = this.pos[bi] - this.pos[ai];
      let dy = this.pos[bi + 1] - this.pos[ai + 1];
      let dz = this.pos[bi + 2] - this.pos[ai + 2];
      const d = Math.hypot(dx, dy, dz) || 1e-6;
      const diff = (d - con.rest) / d * 0.5;
      dx *= diff; dy *= diff; dz *= diff;
      const pa = this.pinned[con.a], pb = this.pinned[con.b];
      if (!pa && !pb) {
        this.pos[ai] += dx; this.pos[ai + 1] += dy; this.pos[ai + 2] += dz;
        this.pos[bi] -= dx; this.pos[bi + 1] -= dy; this.pos[bi + 2] -= dz;
      } else if (!pa) {
        this.pos[ai] += dx * 2; this.pos[ai + 1] += dy * 2; this.pos[ai + 2] += dz * 2;
      } else if (!pb) {
        this.pos[bi] -= dx * 2; this.pos[bi + 1] -= dy * 2; this.pos[bi + 2] -= dz * 2;
      }
    }
  }

  private collide(colliders: Sphere[]) {
    for (const s of colliders) {
      for (let p = 0; p < this.count; p++) {
        if (this.pinned[p]) continue;
        const i = p * 3;
        const dx = this.pos[i] - s.x, dy = this.pos[i + 1] - s.y, dz = this.pos[i + 2] - s.z;
        const d = Math.hypot(dx, dy, dz);
        if (d < s.r && d > 1e-6) {
          const push = (s.r - d) / d;
          this.pos[i] += dx * push; this.pos[i + 1] += dy * push; this.pos[i + 2] += dz * push;
        }
      }
    }
  }

  /** Max deviation of any constraint from its rest length (for tests). */
  maxConstraintError(): number {
    let m = 0;
    for (const con of this.constraints) {
      const ai = con.a * 3, bi = con.b * 3;
      const d = Math.hypot(
        this.pos[bi] - this.pos[ai], this.pos[bi + 1] - this.pos[ai + 1], this.pos[bi + 2] - this.pos[ai + 2],
      );
      m = Math.max(m, Math.abs(d - con.rest));
    }
    return m;
  }
}
