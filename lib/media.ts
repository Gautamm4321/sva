/**
 * Photography. All images are free to use under the Unsplash License
 * (https://unsplash.com/license) and are served from Unsplash's image CDN,
 * which resizes per device. To self-host instead, drop the files in
 * /public/media and set `local` on each entry.
 */

export type Photo = {
  /** images.unsplash.com photo id */
  id: string;
  alt: string;
  credit: string;
  page: string;
  /** Optional self-hosted path, e.g. "/media/hero.jpg". Wins over the CDN. */
  local?: string;
  /** Focal point for object-position. */
  focus?: string;
};

export const PHOTOS = {
  hero: {
    id: "photo-1633100903598-f68bf1e7cfca",
    alt: "Early morning over the Blue Ridge Mountains, mist lying in the valleys",
    credit: "Mark Olsen",
    page: "https://unsplash.com/photos/U5Rdrv5ZOt8",
    focus: "50% 55%",
  },
  lavender: {
    id: "photo-1684746742697-dd830100ba5c",
    alt: "A field of lavender in flower, a mountain in the distance",
    credit: "Thomas Despeyroux",
    page: "https://unsplash.com/photos/0d7ckLu3_t4",
    focus: "50% 60%",
  },
  dawn: {
    id: "photo-1732106846707-0d47acc051a8",
    alt: "Sunrise breaking through morning mist in the mountains",
    credit: "Philipp",
    page: "https://unsplash.com/photos/9pu-4NtgSjg",
    focus: "50% 50%",
  },
} satisfies Record<string, Photo>;

const WIDTHS = [640, 960, 1400, 2000, 2800];

export function src(p: Photo, w = 1400) {
  if (p.local) return p.local;
  return `https://images.unsplash.com/${p.id}?w=${w}&q=72&auto=format&fit=crop`;
}

export function srcSet(p: Photo) {
  if (p.local) return undefined;
  return WIDTHS.map((w) => `${src(p, w)} ${w}w`).join(", ");
}
