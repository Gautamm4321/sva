/**
 * Every line here comes from the svā labs brand deck (About Us, Products in
 * Making). Nothing is a product claim the deck doesn't make.
 */

export type Piece = {
  key: "sva" | "rollon" | "candle" | "fragrance" | "cream";
  /** Short name for thumbnails / lineup labels. */
  name: string;
  /** Small mono line above the headline. */
  kicker: string;
  /** Headline: lead word(s), then the line after the rule. */
  lead: string;
  rest: string;
  /** Small mono note, bottom right. */
  note: string;
  /** Words strung on this piece's strands, top to bottom. */
  words: string[];
};

export const PIECES: Piece[] = [
  {
    key: "sva",
    name: "svā",
    kicker: "svā (n.) — self",
    lead: "svā",
    rest: "a return to self, in the small pauses of the day",
    note: "A sensorial wellness brand built on a simple belief: self-care should feel like coming home to yourself.",
    words: ["svā", "self", "return to self", "come home", "breathe", "slow down", "small rituals", "reconnection"],
  },
  {
    key: "rollon",
    name: "Roll-ons",
    kicker: "Functional roll-ons — in the making",
    lead: "Calm",
    rest: "lavender, vetiver and chamomile, carried into the pauses",
    note: "Clean, plant-powered remedies from natural ingredients, made to turn ordinary moments into small rituals.",
    words: ["calm", "lavender", "vetiver", "chamomile", "breathe", "pause", "relief", "slow down"],
  },
  {
    key: "candle",
    name: "Candles",
    kicker: "Candles — in the making",
    lead: "Candles",
    rest: "for the spaces you live and work in",
    note: "Life doesn’t pause, so we bring wellness into the pauses — pockets of relief throughout your day.",
    words: ["home", "the spaces you live", "and work in", "pockets of relief", "rest", "slow", "pause"],
  },
  {
    key: "fragrance",
    name: "Fragrances",
    kicker: "Functional fragrances — in the making",
    lead: "Fragrance",
    rest: "just what your senses need to slow down",
    note: "From the midday headache that won’t let go, to the restless mind at bedtime.",
    words: ["senses", "no noise", "slow down", "breathe", "midday", "bedtime", "relief", "return"],
  },
  {
    key: "cream",
    name: "Hand creams",
    kicker: "Hand creams — in the making",
    lead: "Hand creams",
    rest: "clean, plant-powered, no harsh additives",
    note: "No harsh additives. No noise. Just what your senses need to slow down, breathe, and return to svā.",
    words: ["plant-powered", "natural", "ingredients", "clean", "no harsh additives", "care", "ritual"],
  },
];

export const CONTACT = {
  email: "info@svalabs.in",
  site: "svalabs.in",
  address: "WeWork Zenia, Hiranandani Business Park, Mumbai 400607",
};
