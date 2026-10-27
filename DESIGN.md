# svā labs — waitlist page · design brief

## References
| Ref | Used for |
|---|---|
| Brand PDF | Identity, palette, all copy. The product photos in the deck are samples, so no products are shown. |
| zhai-farms-site | Nature-first hero, drifting clouds/mist, large serif type, calm paper sections |
| Instagram reel | The *feel* of the 3D: things hanging in space that sway and part when you move through them, soft depth |

## Concept
Dawn over misty hills, seen through a canopy of hanging dried botanicals — lavender, chamomile, vetiver, leaves, small gold beads (the CALM notes from the deck). Move the cursor (or swipe) through them and they part and swing; with sound on, they chime. Scent = botanicals, sound = chimes, nature = the landscape.

## Sections
1. **Hero** — landscape shader (sky, low sun, cloud decks, five ridges with valley mist) + 3D strands + mist in front; dissolves into paper through low cloud. Copy: "Return to self." + one line + Join the waitlist.
2. **svā means self** — the deck's About text, the three moments, one line on what's in the making (text only).
3. **Waitlist** — name, email, consent; small footer (©, email, privacy).

## Palette / type
Paper `#EDE6DC`, ink `#2B211B`, cocoa `#24130C`, gold `#DCAE77`, amber `#8A4A1A`; landscape in sage/olive/lilac haze. Cormorant Garamond · DM Mono · Inter Tight (self-hosted).

## Performance
Ridges are drawn nearest-first with early exits; clouds only in the upper sky; strands ~78 desktop / 54 mobile / 38 low-end, one line batch + one sprite batch; DPR capped and stepped down if frames drop; canvas idles when the hero is off screen; CSS-painted fallback without WebGL; reduced motion stills the scene.
