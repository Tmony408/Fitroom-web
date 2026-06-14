// Default site imagery. These are the fallbacks; admins can override the hero,
// auth, and gallery images at runtime via the admin "Appearance" panel
// (see useSiteSettings / /admin). Every <SmartImage> also degrades to a
// branded gradient if a URL ever fails to load.

const PINS = [
  'https://i.pinimg.com/736x/45/0b/22/450b22fd887ba53199530bd1b573dcfa.jpg',   // 0
  'https://i.pinimg.com/736x/df/3d/6a/df3d6a25bd1d8e064dce6d0d2a6fd196.jpg',   // 1
  'https://i.pinimg.com/736x/49/ab/f7/49abf7bab18583139ec39a1d182b1130.jpg',   // 2
  'https://i.pinimg.com/1200x/2c/27/f7/2c27f75a2ab62fb78d15050b5e1a5bac.jpg',  // 3 (hero)
  'https://i.pinimg.com/736x/7b/b2/66/7bb266dc151be1e3d8f8c1fdf795b1de.jpg',   // 4
  'https://i.pinimg.com/736x/de/7f/01/de7f017fb0b36ac6aaae498843bfa5c9.jpg',   // 5
  'https://i.pinimg.com/736x/66/06/76/660676459714b9861ddb26674b64779b.jpg',   // 6
  'https://i.pinimg.com/736x/1f/fd/d8/1ffdd82ef0bd4ab3b25c93ee212aa11a.jpg',   // 7
  'https://i.pinimg.com/736x/47/f6/8c/47f68c6b2faa9d6dd1d0835eee881fa0.jpg',   // 8
  'https://i.pinimg.com/736x/9a/96/9e/9a969e3fea81b69d078f4c3eeeec4505.jpg',   // 9
  'https://i.pinimg.com/1200x/ab/bb/f3/abbbf3e25662109c77967649cff0f65e.jpg',  // 10 (auth)
  'https://i.pinimg.com/736x/32/40/76/3240766027aae0079f62dc1a2a34fe2a.jpg',   // 11
  'https://i.pinimg.com/736x/9b/df/72/9bdf720298d7f4331e746b4aa539d7f9.jpg',   // 12
  'https://i.pinimg.com/736x/e8/d5/2e/e8d52e878e1c450a6207bffde403fe5f.jpg',   // 13
  'https://i.pinimg.com/736x/ef/b2/01/efb201fb5a1cb5f789540492956c1792.jpg',   // 14
  'https://i.pinimg.com/1200x/95/b4/ab/95b4ab874764aca47029c9760372dd94.jpg',  // 15
];

export interface GarmentImage { label: string; src: string }

export const DEFAULT_HERO = PINS[3];
export const DEFAULT_AUTH = PINS[10];

// One picture per garment type for the landing gallery + product fallbacks.
export const GARMENTS: GarmentImage[] = [
  { label: 'Agbada', src: PINS[0] },
  { label: 'Senator', src: PINS[1] },
  { label: 'Kaftan', src: PINS[2] },
  { label: 'Aso Ebi', src: PINS[4] },
  { label: 'Ankara', src: PINS[5] },
  { label: 'Dashiki', src: PINS[6] },
  { label: 'Gele', src: PINS[7] },
  { label: 'Bridal', src: PINS[8] },
  { label: 'Buba & Iro', src: PINS[9] },
  { label: 'Native wear', src: PINS[11] },
];

const BY_LABEL: Record<string, GarmentImage> = Object.fromEntries(
  GARMENTS.map((g) => [g.label.toLowerCase(), g]),
);

export function categoryImage(category: string, i = 0): string {
  const key = (category || '').toLowerCase();
  if (BY_LABEL[key]) return BY_LABEL[key].src;
  const hit = GARMENTS.find((g) => key.includes(g.label.toLowerCase()) || g.label.toLowerCase().includes(key));
  if (hit) return hit.src;
  return GARMENTS[i % GARMENTS.length].src;
}

// URL-friendly slug for a style label, and the reverse lookup.
export const slugify = (s: string) =>
  (s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function labelFromSlug(slug: string): string | null {
  const s = slugify(slug);
  return GARMENTS.find((g) => slugify(g.label) === s)?.label ?? null;
}

// Curated seed images for a category collection — used to fill the gallery
// before (and alongside) real designer uploads, so a style never looks empty.
// Starts from the category's own image, then rotates the shared pool.
export function categorySeed(label: string, count = 8): string[] {
  const key = (label || '').toLowerCase();
  let start = PINS.findIndex((p) => p === BY_LABEL[key]?.src);
  if (start < 0) start = Math.abs([...key].reduce((a, c) => a + c.charCodeAt(0), 0)) % PINS.length;
  const out: string[] = [];
  for (let i = 0; i < Math.min(count, PINS.length); i++) out.push(PINS[(start + i) % PINS.length]);
  return out;
}

export const IMAGES = {
  hero: DEFAULT_HERO,
  auth: DEFAULT_AUTH,
  gallery: GARMENTS,
} as const;

export const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg,#fb7427,#ec4899)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#13c08a,#16c5c0)',
  'linear-gradient(135deg,#f5b301,#fb7427)',
];
