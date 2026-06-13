// Keyword-matched imagery. We use LoremFlickr, which returns a real photo
// tagged with the given keyword(s) — so the "agbada" slot shows agbada, the
// "kaftan" slot shows kaftan, and so on. `lock` pins a stable photo per slot
// (it won't change on every reload). Every <SmartImage> still falls back to a
// branded gradient if a URL ever fails, so the UI never shows a broken image.
//
// Want exact shots? Replace any URL below with your own product photography or
// a specific image URL — the structure and fallback stay the same.

const LF = (keywords: string, lock: number, w = 900, h = 1100) =>
  `https://loremflickr.com/${w}/${h}/${encodeURIComponent(keywords)}?lock=${lock}`;

export interface GarmentImage { label: string; keywords: string; src: string; }

// One suiting picture per garment type — many types, not just agbada.
export const GARMENTS: GarmentImage[] = [
  { label: 'Agbada',     keywords: 'agbada,nigeria',                    src: LF('agbada,nigeria', 11) },
  { label: 'Senator',    keywords: 'african,menswear,traditional',     src: LF('african,menswear,traditional', 12) },
  { label: 'Kaftan',     keywords: 'kaftan,men',                       src: LF('kaftan,men', 13) },
  { label: 'Aso Ebi',    keywords: 'asoebi,nigeria,fashion',          src: LF('asoebi,nigeria,fashion', 14) },
  { label: 'Ankara',     keywords: 'ankara,african,fashion',          src: LF('ankara,african,fashion', 15) },
  { label: 'Dashiki',    keywords: 'dashiki,african',                 src: LF('dashiki,african', 16) },
  { label: 'Gele',       keywords: 'gele,headwrap,nigeria',           src: LF('gele,headwrap,nigeria', 17) },
  { label: 'Bridal',     keywords: 'african,wedding,bride',           src: LF('african,wedding,bride', 18) },
  { label: 'Buba & Iro', keywords: 'yoruba,traditional,clothing',     src: LF('yoruba,traditional,clothing', 19) },
  { label: 'Native wear',keywords: 'african,traditional,clothing',    src: LF('african,traditional,clothing', 20) },
];

// Quick lookup by category name used on products (Senator / Kaftan / Agbada…).
const BY_LABEL: Record<string, GarmentImage> = Object.fromEntries(
  GARMENTS.map((g) => [g.label.toLowerCase(), g]),
);

export function categoryImage(category: string, i = 0): string {
  const key = (category || '').toLowerCase();
  if (BY_LABEL[key]) return BY_LABEL[key].src;
  // partial match (e.g. "senator wear" -> "senator")
  const hit = GARMENTS.find((g) => key.includes(g.label.toLowerCase()) || g.label.toLowerCase().includes(key));
  if (hit) return hit.src;
  return GARMENTS[i % GARMENTS.length].src;
}

export const IMAGES = {
  hero: LF('agbada,nigeria,fashion', 11, 1100, 1300),
  auth: LF('african,fashion,portrait', 21, 1000, 1300),
  // landing gallery = many garment types, each with its own matching picture
  gallery: GARMENTS,
} as const;

export const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg,#fb7427,#ec4899)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#13c08a,#16c5c0)',
  'linear-gradient(135deg,#f5b301,#fb7427)',
];
