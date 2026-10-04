import { CARDS, CARD_BY_CODE, RANK_VALUE } from './cards';

/**
 * The Card Drop draw: pure and deterministic, so anyone can re-run it.
 *
 * 1. Before the draw, the server commits to a secret random seed by showing
 *    sha256(seed) on the projector (the "seal").
 * 2. The draw sorts the team IDs alphabetically and shuffles them with a PRNG
 *    seeded from that seed: this is the pick order.
 * 3. In pick order, each team gets its highest choice that still has a seat.
 * 4. After the draw the seed is revealed, so the result can be re-computed
 *    and checked against the seal.
 *
 * No server-only imports here: the stage page re-runs it to verify.
 */

/** xoshiro128** seeded from the first 128 bits of a hex seed. */
function makeRng(seedHex: string): () => number {
  const words = [0, 1, 2, 3].map((i) => parseInt(seedHex.slice(i * 8, i * 8 + 8), 16) >>> 0);
  let [a, b, c, d] = words.some((w) => w !== 0) ? words : [1, 2, 3, 4];
  const rotl = (x: number, k: number) => (x << k) | (x >>> (32 - k));
  return () => {
    const result = Math.imul(rotl(Math.imul(b, 5), 7), 9) >>> 0;
    const t = b << 9;
    c ^= a;
    d ^= b;
    b ^= c;
    a ^= d;
    c ^= t;
    d = rotl(d, 11);
    return result / 4294967296; // [0, 1)
  };
}

/** Fisher–Yates over the alphabetically sorted IDs. */
export function shuffleOrder(seedHex: string, teamIds: string[]): string[] {
  const rng = makeRng(seedHex);
  const ids = [...teamIds].sort();
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export interface DrawResult {
  teamId: string;
  pick: number; // 1-based position in the draft
  card: string;
  /** 1, 2 or 3 = which choice it was; 0 = none of the choices had a seat. */
  via: 0 | 1 | 2 | 3;
}

/**
 * Give each team, in pick order, its highest choice with a free seat.
 * When all choices are full: same track as the first choice, then the
 * nearest rank, then the card with the most free seats.
 */
export function assignCards(order: string[], prefs: Record<string, string[]>, cap: number): DrawResult[] {
  const seats: Record<string, number> = Object.fromEntries(CARDS.map((c) => [c.code, cap]));
  const cardIndex = Object.fromEntries(CARDS.map((c, i) => [c.code, i]));

  return order.map((teamId, idx) => {
    const choices = (prefs[teamId] || []).filter((c) => CARD_BY_CODE[c]);
    const hit = choices.findIndex((c) => seats[c] > 0);

    let card: string;
    let via: DrawResult['via'];
    if (hit >= 0) {
      card = choices[hit];
      via = (hit + 1) as 1 | 2 | 3;
    } else {
      const first = choices[0] ? CARD_BY_CODE[choices[0]] : null;
      const open = CARDS.filter((c) => seats[c.code] > 0);
      open.sort((x, y) => {
        if (first) {
          const tx = x.track === first.track ? 0 : 1;
          const ty = y.track === first.track ? 0 : 1;
          if (tx !== ty) return tx - ty;
          const rx = Math.abs(RANK_VALUE[x.rank] - RANK_VALUE[first.rank]);
          const ry = Math.abs(RANK_VALUE[y.rank] - RANK_VALUE[first.rank]);
          if (rx !== ry) return rx - ry;
        }
        if (seats[y.code] !== seats[x.code]) return seats[y.code] - seats[x.code];
        return cardIndex[x.code] - cardIndex[y.code];
      });
      card = open[0].code;
      via = 0;
    }
    seats[card] -= 1;
    return { teamId, pick: idx + 1, card, via };
  });
}
