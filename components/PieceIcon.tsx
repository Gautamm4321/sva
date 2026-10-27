/** Small line drawings of each piece, for the framed prev/next thumbnails. */
export default function PieceIcon({ k }: { k: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 48 32" width="48" height="32" aria-hidden>
      {k === "sva" && (
        <>
          <circle cx="24" cy="15" r="11" fill="currentColor" opacity="0.9" />
          <circle cx="24" cy="15" r="9" fill="none" stroke="#DCAE77" strokeWidth="0.8" />
          <text x="24" y="18.5" textAnchor="middle" fontSize="9" fill="#DCAE77" fontFamily="Cormorant, serif">
            svā
          </text>
        </>
      )}
      {k === "rollon" && (
        <>
          <rect x="6" y="11" width="22" height="10" rx="3" fill="#8A4A1A" opacity="0.85" />
          <rect x="28" y="10.5" width="14" height="11" rx="1.5" fill="currentColor" />
          <path d="M8 26h32" {...common} opacity="0.4" />
        </>
      )}
      {k === "candle" && (
        <>
          <rect x="15" y="10" width="18" height="17" rx="2" fill="currentColor" />
          <rect x="18" y="15" width="12" height="7" fill="#F1ECE6" />
          <path d="M24 9c-2-2.5 0-5 0-5s2 2.5 0 5z" fill="#E2A33C" />
        </>
      )}
      {k === "fragrance" && (
        <>
          <rect x="19" y="3" width="10" height="7" rx="1" fill="currentColor" />
          <rect x="13" y="11" width="22" height="17" rx="3" fill="#8A4A1A" opacity="0.85" />
        </>
      )}
      {k === "cream" && (
        <>
          <path d="M6 11.5h26l3 1.5v6l-3 1.5H6l-1-1.5v-6z" {...common} />
          <rect x="35" y="12.5" width="8" height="7" rx="1" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
