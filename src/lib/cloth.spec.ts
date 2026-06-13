import { ClothSim, Sphere } from './cloth';

describe('ClothSim', () => {
  it('builds the right particle count', () => {
    const c = new ClothSim(5, 6, 0.1, 0, 1, 0);
    expect(c.count).toBe(30);
  });

  it('keeps constraints near rest length after stepping (stability)', () => {
    const c = new ClothSim(6, 8, 0.1, 0, 1, 0);
    c.pinTopRow();
    for (let i = 0; i < 60; i++) c.step(1 / 60, -9.8, [], 4);
    // a stable solver keeps the weave close to rest length
    expect(c.maxConstraintError()).toBeLessThan(0.05);
  });

  it('pinned top row stays fixed while the rest falls', () => {
    const c = new ClothSim(4, 6, 0.1, 0, 1, 0);
    c.pinTopRow();
    const topYBefore = c.pos[1];
    const bottomYBefore = c.pos[(5 * 4) * 3 + 1];
    for (let i = 0; i < 40; i++) c.step(1 / 60, -9.8);
    expect(c.pos[1]).toBeCloseTo(topYBefore, 5);       // pinned, unchanged
    expect(c.pos[(5 * 4) * 3 + 1]).toBeLessThan(bottomYBefore); // fell under gravity
  });

  it('pushes particles outside a collider sphere', () => {
    const c = new ClothSim(4, 4, 0.1, -0.15, 1, 0);
    const sphere: Sphere = { x: 0, y: 0.85, z: 0, r: 0.25 };
    for (let i = 0; i < 80; i++) c.step(1 / 60, -9.8, [sphere], 4);
    for (let p = 0; p < c.count; p++) {
      const i = p * 3;
      const d = Math.hypot(c.pos[i] - sphere.x, c.pos[i + 1] - sphere.y, c.pos[i + 2] - sphere.z);
      expect(d).toBeGreaterThanOrEqual(sphere.r - 0.02); // resolved out of the body
    }
  });

  it('is deterministic for identical setups', () => {
    const run = () => { const c = new ClothSim(4, 4, 0.1, 0, 1, 0); c.pinTopRow(); for (let i = 0; i < 20; i++) c.step(1 / 60, -9.8); return Array.from(c.pos); };
    expect(run()).toEqual(run());
  });
});
