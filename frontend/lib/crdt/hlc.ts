/**
 * Hybrid Logical Clock (HLC)
 * --------------------------
 * A timestamp that combines physical wall-clock time with a logical counter so
 * that it (a) stays close to real time, (b) is monotonic even when the wall
 * clock jumps backwards, and (c) gives every event a *total order* across
 * replicas. This is what CockroachDB and many local-first systems use instead of
 * plain Lamport clocks, because it keeps human-meaningful ordering while still
 * being causally correct.
 *
 * Reference: Kulkarni et al., "Logical Physical Clocks and Consistent Snapshots
 * in Globally Distributed Databases" (2014).
 *
 * A timestamp is `(millis, counter, node)`:
 *   - millis  : the largest physical time this clock has seen
 *   - counter : disambiguates multiple events within the same millisecond
 *   - node    : the replica id — a deterministic tiebreak so two replicas can
 *               never produce equal-but-different timestamps (total order).
 */

export interface HLCTimestamp {
  millis: number;
  counter: number;
  node: string;
}

/** Total order over timestamps: millis, then counter, then node id. */
export function compareHLC(a: HLCTimestamp, b: HLCTimestamp): number {
  if (a.millis !== b.millis) return a.millis < b.millis ? -1 : 1;
  if (a.counter !== b.counter) return a.counter < b.counter ? -1 : 1;
  if (a.node === b.node) return 0;
  return a.node < b.node ? -1 : 1;
}

export function hlcEqual(a: HLCTimestamp, b: HLCTimestamp): boolean {
  return a.millis === b.millis && a.counter === b.counter && a.node === b.node;
}

export function formatHLC(t: HLCTimestamp): string {
  return `${t.millis}:${t.counter}@${t.node}`;
}

export class HLC {
  private millis = 0;
  private counter = 0;

  /**
   * @param node      this replica's id (total-order tiebreak)
   * @param physical  injectable clock source (defaults to Date.now) — injecting
   *                  a deterministic source is what makes the tests reproducible.
   */
  constructor(
    public readonly node: string,
    private readonly physical: () => number = () => Date.now(),
  ) {}

  /** Timestamp a *local* event. */
  now(): HLCTimestamp {
    const pt = this.physical();
    if (pt > this.millis) {
      this.millis = pt;
      this.counter = 0;
    } else {
      // Wall clock didn't advance (same ms or went backwards) → bump counter so
      // the timestamp is still strictly greater than the previous one.
      this.counter += 1;
    }
    return { millis: this.millis, counter: this.counter, node: this.node };
  }

  /**
   * Fold a timestamp we *received* from another replica into our clock, so any
   * event we generate afterwards is causally ordered after it (happens-after).
   * This is the canonical HLC receive rule.
   */
  receive(remote: HLCTimestamp): HLCTimestamp {
    const pt = this.physical();
    const lm = this.millis;
    const rm = remote.millis;

    if (pt > lm && pt > rm) {
      this.millis = pt;
      this.counter = 0;
    } else if (lm === rm) {
      this.millis = lm;
      this.counter = Math.max(this.counter, remote.counter) + 1;
    } else if (lm > rm) {
      this.counter += 1;
    } else {
      this.millis = rm;
      this.counter = remote.counter + 1;
    }
    return { millis: this.millis, counter: this.counter, node: this.node };
  }
}
