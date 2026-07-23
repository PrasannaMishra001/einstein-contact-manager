/**
 * Last-Writer-Wins building blocks
 * --------------------------------
 * The simplest useful CRDTs. A register holds one value plus the HLC timestamp
 * of the write that set it; merging two registers keeps whichever write has the
 * greater timestamp. Because the HLC gives a *total* order, the merge is:
 *   - commutative : merge(a, b) === merge(b, a)
 *   - associative : merge(merge(a, b), c) === merge(a, merge(b, c))
 *   - idempotent  : merge(a, a) === a
 * Those three properties are exactly the definition of a join-semilattice, which
 * is what guarantees Strong Eventual Consistency: any two replicas that have
 * seen the same set of writes converge to the same value, regardless of order.
 *
 * A FieldMap is a map of independent registers — so two replicas editing
 * *different* fields of the same contact never conflict, and editing the *same*
 * field is resolved deterministically by timestamp.
 */

import { HLCTimestamp, compareHLC } from "./hlc";

export type Scalar = string | number | boolean | null;

export interface LWWRegister<T extends Scalar = Scalar> {
  value: T;
  ts: HLCTimestamp;
}

/** Join of two registers: the later write wins. Ties are impossible (HLC node id). */
export function mergeRegister<T extends Scalar>(
  a: LWWRegister<T>,
  b: LWWRegister<T>,
): LWWRegister<T> {
  return compareHLC(a.ts, b.ts) >= 0 ? a : b;
}

/** A record of field name → register. */
export type FieldMap = Record<string, LWWRegister>;

/** Join of two field maps: union of keys, per-key LWW. */
export function mergeFieldMap(a: FieldMap, b: FieldMap): FieldMap {
  const out: FieldMap = {};
  for (const k of Object.keys(a)) out[k] = a[k];
  for (const k of Object.keys(b)) {
    out[k] = k in out ? mergeRegister(out[k], b[k]) : b[k];
  }
  return out;
}

/** Flatten a field map to plain `{ field: value }` for the UI / API. */
export function readFields(fields: FieldMap): Record<string, Scalar> {
  const out: Record<string, Scalar> = {};
  for (const k of Object.keys(fields)) out[k] = fields[k].value;
  return out;
}
