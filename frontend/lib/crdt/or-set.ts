/**
 * Observed-Remove Set (OR-Set) — "add-wins"
 * -----------------------------------------
 * LWW is wrong for membership. If device A adds the tag "work" while device B
 * concurrently removes it, a last-writer-wins flag would let a stale remove
 * delete a fresh add. The OR-Set fixes this: every *add* mints a unique token,
 * and a *remove* can only erase the specific tokens it has actually observed.
 * A concurrent add (whose token the remove never saw) therefore survives — the
 * element stays present. This is the standard "add-wins" semantics used for
 * sets/tags in Riak, Automerge, etc.
 *
 * Reference: Shapiro, Preguiça, Baquero, Zawirski, "Conflict-free Replicated
 * Data Types" (2011), §3 (OR-Set).
 *
 * Representation (JSON-friendly, so it serializes straight into a sync payload):
 *   adds    : element -> list of unique tokens that added it
 *   removed : flat list of tokens that have been tombstoned
 * An element is present iff it has at least one token not in `removed`.
 */

export interface ORSet {
  adds: Record<string, string[]>;
  removed: string[];
}

export function emptyORSet(): ORSet {
  return { adds: {}, removed: [] };
}

let tokenSeq = 0;
/** Mint a globally-unique token for an add. */
export function mintToken(node: string): string {
  tokenSeq += 1;
  return `${node}:${Date.now().toString(36)}:${tokenSeq}`;
}

export function addElement(set: ORSet, element: string, token: string): ORSet {
  const tokens = set.adds[element] ? [...set.adds[element]] : [];
  if (!tokens.includes(token)) tokens.push(token);
  return { adds: { ...set.adds, [element]: tokens }, removed: set.removed };
}

/** Remove tombstones every token *currently observed* for the element. */
export function removeElement(set: ORSet, element: string): ORSet {
  const observed = set.adds[element] ?? [];
  if (observed.length === 0) return set;
  const removed = [...set.removed];
  for (const t of observed) if (!removed.includes(t)) removed.push(t);
  return { adds: set.adds, removed };
}

/** Join of two OR-Sets: union the add-tokens, union the tombstones. */
export function mergeORSet(a: ORSet, b: ORSet): ORSet {
  const adds: Record<string, string[]> = {};
  for (const el of new Set([...Object.keys(a.adds), ...Object.keys(b.adds)])) {
    adds[el] = Array.from(new Set([...(a.adds[el] ?? []), ...(b.adds[el] ?? [])]));
  }
  const removed = Array.from(new Set([...a.removed, ...b.removed]));
  return { adds, removed };
}

/** Materialize the current membership. */
export function readORSet(set: ORSet): string[] {
  const removed = new Set(set.removed);
  const out: string[] = [];
  for (const el of Object.keys(set.adds)) {
    if (set.adds[el].some((t) => !removed.has(t))) out.push(el);
  }
  return out.sort();
}
