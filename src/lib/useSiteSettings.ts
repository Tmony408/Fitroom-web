'use client';
import { useEffect, useState } from 'react';
import { api } from './api';
import { DEFAULT_HERO, DEFAULT_AUTH, GARMENTS, GarmentImage } from './images';

export interface SiteImages {
  hero: string;
  auth: string;
  gallery: GarmentImage[]; // garment label + (admin-overridden or default) src
}

const defaults: SiteImages = {
  hero: DEFAULT_HERO,
  auth: DEFAULT_AUTH,
  gallery: GARMENTS,
};

/**
 * Site marketing imagery: admin overrides (from the API) merged over the code
 * defaults. Garment labels always come from code; only the image URLs can be
 * swapped by an admin, so the gallery captions stay correct.
 */
export function useSiteSettings(): SiteImages {
  const [images, setImages] = useState<SiteImages>(defaults);
  useEffect(() => {
    (async () => {
      try {
        const s = await api.getSiteSettings();
        if (!s) return;
        setImages({
          hero: s.heroUrl || DEFAULT_HERO,
          auth: s.authUrl || DEFAULT_AUTH,
          gallery: GARMENTS.map((g, i) => ({ label: g.label, src: s.gallery?.[i] || g.src })),
        });
      } catch { /* keep defaults */ }
    })();
  }, []);
  return images;
}
