import { type Photo as P, src, srcSet } from "@/lib/media";

/** A real photograph, responsive, with no layout shift (fills its box). */
export default function Photo({
  photo,
  className,
  sizes = "100vw",
  priority = false,
}: {
  photo: P;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    // Unsplash's CDN already resizes and re-encodes, so a plain <img> with
    // srcset is the right tool here (no double optimisation).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={src(photo)}
      srcSet={srcSet(photo)}
      sizes={sizes}
      alt={photo.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      style={{ objectPosition: photo.focus }}
    />
  );
}
