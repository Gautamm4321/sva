/**
 * Photography. All images are free to use under the Unsplash License
 * (https://unsplash.com/license). They are self-hosted from /public/media as
 * WebP at two widths; entries without `local` fall back to Unsplash's CDN.
 */

export type Photo = {
  /** images.unsplash.com photo id */
  id: string;
  alt: string;
  credit: string;
  page: string;
  /** Self-hosted renditions (largest last). Win over the CDN. */
  local?: { src: string; w: number }[];
  /** Focal point for object-position. */
  focus?: string;
};

export const PHOTOS = {
  hero: {
    id: "photo-1633100903598-f68bf1e7cfca",
    alt: "Early morning over the Blue Ridge Mountains, mist lying in the valleys",
    credit: "Mark Olsen",
    page: "https://unsplash.com/photos/U5Rdrv5ZOt8",
    focus: "40% 60%",
    local: [
      { src: "/media/mist-valleys-960.webp", w: 960 },
      { src: "/media/mist-valleys-1548.webp", w: 1548 },
    ],
  },
  lavender: {
    id: "photo-1684746742697-dd830100ba5c",
    alt: "A field of lavender in flower, a mountain in the distance",
    credit: "Thomas Despeyroux",
    page: "https://unsplash.com/photos/0d7ckLu3_t4",
    focus: "62% 70%",
    local: [
      { src: "/media/lavender-field-1000.webp", w: 1000 },
      { src: "/media/lavender-field-1800.webp", w: 1800 },
    ],
  },
  dawn: {
    id: "photo-1732106846707-0d47acc051a8",
    alt: "Sunrise breaking through morning mist in the mountains",
    credit: "Philipp",
    page: "https://unsplash.com/photos/9pu-4NtgSjg",
    focus: "50% 45%",
    local: [
      { src: "/media/dawn-mist-960.webp", w: 960 },
      { src: "/media/dawn-mist-1740.webp", w: 1740 },
    ],
  },
} satisfies Record<string, Photo>;

const WIDTHS = [640, 960, 1400, 2000, 2800];

export function src(p: Photo, w = 1400) {
  if (p.local) return p.local[p.local.length - 1].src;
  return `https://images.unsplash.com/${p.id}?w=${w}&q=72&auto=format&fit=crop`;
}

export function srcSet(p: Photo) {
  if (p.local) return p.local.map((r) => `${r.src} ${r.w}w`).join(", ");
  return WIDTHS.map((w) => `${src(p, w)} ${w}w`).join(", ");
}
