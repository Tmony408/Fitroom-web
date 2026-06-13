import { measurementsFromPose, ellipseCirc, Landmark, PoseInput } from './poseMeasure';

// Build a plausible upright figure in a 1000px-tall frame.
function figure(shoulderHalf = 114): PoseInput {
  const L: Landmark[] = Array.from({ length: 33 }, () => ({ x: 500, y: 500, visibility: 0.9 }));
  const set = (i: number, x: number, y: number) => { L[i] = { x, y, visibility: 0.9 }; };
  set(0, 500, 130);            // nose
  set(2, 480, 120); set(5, 520, 120);          // eyes
  set(11, 500 - shoulderHalf, 230); set(12, 500 + shoulderHalf, 230); // shoulders
  set(13, 500 - shoulderHalf - 6, 400); set(14, 500 + shoulderHalf + 6, 400); // elbows
  set(15, 500 - shoulderHalf - 8, 560); set(16, 500 + shoulderHalf + 8, 560); // wrists
  set(23, 430, 560); set(24, 570, 560);        // hips
  set(25, 440, 740); set(26, 560, 740);        // knees
  set(27, 445, 930); set(28, 555, 930);        // ankles
  set(29, 445, 945); set(30, 555, 945);        // heels
  set(31, 450, 950); set(32, 550, 950);        // feet
  return { landmarks: L, width: 1000, height: 1000 };
}

describe('measurementsFromPose', () => {
  it('returns the declared height verbatim', () => {
    expect(measurementsFromPose(figure(), 180).measurements.height.val).toBe(180);
  });

  it('produces anatomically plausible ranges', () => {
    const m = measurementsFromPose(figure(), 180).measurements;
    expect(m.shoulder.val).toBeGreaterThan(35); expect(m.shoulder.val).toBeLessThan(60);
    expect(m.chest.val).toBeGreaterThan(60); expect(m.chest.val).toBeLessThan(140);
    expect(m.waist.val).toBeGreaterThan(50); expect(m.waist.val).toBeLessThan(130);
    expect(m.hip.val).toBeGreaterThan(55); expect(m.hip.val).toBeLessThan(140);
    expect(m.inseam.val).toBeGreaterThan(60); expect(m.inseam.val).toBeLessThan(95);
    expect(m.armLength.val).toBeGreaterThan(45); expect(m.armLength.val).toBeLessThan(85);
  });

  it('a broader frame yields a larger chest', () => {
    const narrow = measurementsFromPose(figure(95), 180).measurements.chest.val;
    const broad = measurementsFromPose(figure(135), 180).measurements.chest.val;
    expect(broad).toBeGreaterThan(narrow);
  });

  it('scales linear measurements with declared height', () => {
    const short = measurementsFromPose(figure(), 160).measurements.inseam.val;
    const tall = measurementsFromPose(figure(), 200).measurements.inseam.val;
    expect(tall).toBeGreaterThan(short);
  });

  it('keeps all confidences within [45, 99]', () => {
    const m = measurementsFromPose(figure(), 180).measurements;
    Object.values(m).forEach((v) => {
      expect(v.conf).toBeGreaterThanOrEqual(45);
      expect(v.conf).toBeLessThanOrEqual(99);
    });
  });

  it('a side photo does not lower confidence', () => {
    const without = measurementsFromPose(figure(), 180, { sideAvailable: false }).measurements.chest.conf;
    const withSide = measurementsFromPose(figure(), 180, { sideAvailable: true }).measurements.chest.conf;
    expect(withSide).toBeGreaterThanOrEqual(without);
  });

  it('ellipseCirc grows with width', () => {
    expect(ellipseCirc(40, 28)).toBeGreaterThan(ellipseCirc(30, 28));
  });
});
