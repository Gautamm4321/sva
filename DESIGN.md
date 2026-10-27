# svā labs — coming-soon experience · design brief

## Sources
| Ref | Status | Used for |
|---|---|---|
| Brand PDF (`SVĀ LABS.pdf`, 5 pp) | Read in full | Identity, palette, copy, product context — source of truth |
| Instagram reel (screen recording, 20 s) | Watched frame by frame | **Primary interaction model**: warm linen paper, one crafted object up top, a curtain of hanging text strands that the cursor sweeps and tangles, big soft diagonal shadow, serif headline with em-dash, mono microtype, framed prev/next thumbnails, final pull-back to a lineup |
| zhai-farms-site (GitHub) | Cloned + inspected | Quality bar: editorial serif type, slow reveals, hairline rules, meta micro-type |

Nothing is copied: the objects, words, palette and type are svā's; the curtain physics, shaders and layout are written from scratch.

## What the PDF says (no invented claims)
- svā = "self". Tagline: **return to self**. Entity: svā labs.
- Sensorial wellness; self-care "like coming home to yourself"; clean, plant-powered remedies from natural ingredients; small rituals of reconnection.
- Moments: midday headache, restless mind at bedtime, the spaces you live and work in → pockets of relief. "No harsh additives. No noise."
- In the making: functional roll-ons, hand creams, candles, functional fragrances. Pictured: CALM roll-on — lavender · vetiver · chamomile, 10 ml, amber glass, dark bronze cap.
- Contact: info@svalabs.in · svalabs.in · WeWork Zenia, Hiranandani Business Park, Mumbai 400607. No social handles supplied → none shown.

## Concept — "Strands of self"
Each piece of svā hangs over the page like a wind chime: the svā seal, the Calm roll-on, a candle, a flacon, a hand-cream tube — each modelled after the deck's photography. Beneath each falls a curtain of strands strung with svā's own words (*return to self · breathe · lavender · vetiver · chamomile · slow down…*), ending in tiny botanical beads from the Calm blend.

- **Scent** — words and botanicals drifting down from the vessel, as if diffusing from it.
- **Sound** — the curtain is a chime: sweep through it and (with sound on) each strand rings, pitched left→right.
- **Nature** — lavender, chamomile and vetiver beads; linen paper; soft daylight shadows.

**Central interaction:** move through the strands — they part, swing and tangle (verlet physics). Secondary: press and hold to breathe in (the strands gather up), release to breathe out (a gust + a soft chord).

## Palette
| Token | Hex | Source |
|---|---|---|
| paper | `#EDE6DC` | deck cream `#F1ECE6`, warmed toward the reel's linen |
| cocoa | `#24130C` | roundel |
| gold | `#DCAE77` | foil wordmark |
| taupe | `#C6BAAB` | "svā labs" wordmark |
| ink | `#2B211B` | text |
| amber | `#8A4A1A` | glass |

## Type
Cormorant Garamond (display, headlines, wordmark) · DM Mono (labels, notes — the reel's microtype) · Inter Tight (body, form). All self-hosted, OFL.

## Structure
1. **Hero** — one piece at a time, carousel via framed thumbnails / dots / arrow keys; copy per piece.
2. **Philosophy** (paper) — "svā means self." + scent / sound / nature.
3. **In the making** (world) — camera pulls back, pieces draw together into a lineup and pan by with scroll; the three moments step in.
4. **Waitlist** (paper) — name, email, explicit consent.
5. **Footer** (cocoa).

## Motion
Breath-paced, eased, no bounce. One fixed WebGL canvas; paper sections slide over it. Rendering stops when no world view is on screen. `prefers-reduced-motion`: no smooth scroll, no camera travel, ambient sway nearly still, curtains still respond to the user.

## Mobile
Piece + curtain in the upper ~60%, copy stacked below on a soft paper fade; thumbs flank the dots. A vertical swipe sweeps the strands while the page scrolls. Lower DPR, no glass transmission, smaller shadow map; frame governor steps quality down if the device struggles.
