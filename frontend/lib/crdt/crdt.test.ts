/**
 * Convergence tests — the proof that this is actually a CRDT.
 * We assert the three join-semilattice laws (commutativity, associativity,
 * idempotence) and then hammer it with randomized concurrent histories: many
 * replicas editing offline, gossiping in random order, must all converge to the
 * exact same observable state (Strong Eventual Consistency).
 */
import { describe, expect, it } from "vitest";
import { compareHLC } from "./hlc";
import { digest, materialize, mergeState, Replica, type ContactField } from "./contact-store";

/** A replica whose physical clock just increments on every read (monotonic). */
function makeReplica(id: string, base = 0): Replica {
  let t = base;
  return new Replica(id, () => (t += 1));
}

/** Tiny seeded PRNG (mulberry32) so failures are reproducible. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIELDS: ContactField[] = ["name", "phone", "email", "company", "notes"];

describe("HLC total order", () => {
  it("is a strict total order with node-id tiebreak", () => {
    const a = { millis: 5, counter: 0, node: "A" };
    const b = { millis: 5, counter: 0, node: "B" };
    expect(compareHLC(a, b)).toBeLessThan(0);
    expect(compareHLC(b, a)).toBeGreaterThan(0);
    expect(compareHLC(a, a)).toBe(0);
    expect(compareHLC({ millis: 6, counter: 0, node: "A" }, b)).toBeGreaterThan(0);
  });
});

describe("concurrent edits", () => {
  it("keeps concurrent edits to DIFFERENT fields (no false conflict)", () => {
    const A = makeReplica("A");
    A.create("c1", { name: "Ada" });
    const B = makeReplica("B");
    B.merge(A.snapshot());

    // offline divergence
    A.setField("c1", "phone", "111");
    B.setField("c1", "email", "b@x.com");

    const sa = A.snapshot();
    A.merge(B.snapshot());
    B.merge(sa);

    expect(digest(A.state)).toBe(digest(B.state));
    const c = A.contacts()[0];
    expect(c.phone).toBe("111");
    expect(c.email).toBe("b@x.com");
    expect(c.name).toBe("Ada");
  });

  it("resolves concurrent edits to the SAME field deterministically", () => {
    const A = makeReplica("A");
    A.create("c1", { name: "x" });
    const B = makeReplica("B");
    B.merge(A.snapshot());

    A.setField("c1", "name", "FromA");
    B.setField("c1", "name", "FromB");

    const sa = A.snapshot();
    A.merge(B.snapshot());
    B.merge(sa);

    // Both replicas agree, and they agree on ONE of the two values (no merge garbage).
    expect(digest(A.state)).toBe(digest(B.state));
    expect(["FromA", "FromB"]).toContain(A.contacts()[0].name);
  });

  it("delete vs concurrent edit converges (LWW tombstone)", () => {
    const A = makeReplica("A");
    A.create("c1", { name: "Temp" });
    const B = makeReplica("B");
    B.merge(A.snapshot());

    A.remove("c1");
    B.setField("c1", "name", "Edited");

    const sa = A.snapshot();
    A.merge(B.snapshot());
    B.merge(sa);
    expect(digest(A.state)).toBe(digest(B.state));
  });
});

describe("OR-Set tags are add-wins", () => {
  it("a concurrent re-add beats a delete", () => {
    const A = makeReplica("A");
    A.create("c1", { name: "Z" });
    A.addTag("c1", "work");
    const B = makeReplica("B");
    B.merge(A.snapshot());

    // concurrently: A removes the tag it has seen, B adds a fresh instance
    A.removeTag("c1", "work");
    B.addTag("c1", "work");

    const sa = A.snapshot();
    A.merge(B.snapshot());
    B.merge(sa);

    expect(digest(A.state)).toBe(digest(B.state));
    expect(A.contacts()[0].tags).toContain("work");
  });
});

describe("join-semilattice laws", () => {
  const A = makeReplica("A");
  A.create("c1", { name: "a" });
  A.setField("c2", "name", "two");
  const B = makeReplica("B", 50);
  B.merge(A.snapshot());
  B.setField("c1", "phone", "9");
  B.addTag("c2", "vip");
  const C = makeReplica("C", 90);
  C.merge(B.snapshot());
  C.remove("c2");
  const sa = A.snapshot(), sb = B.snapshot(), sc = C.snapshot();

  it("commutative", () => {
    expect(digest(mergeState(sa, sb))).toBe(digest(mergeState(sb, sa)));
  });
  it("idempotent", () => {
    expect(digest(mergeState(sa, sa))).toBe(digest(sa));
  });
  it("associative", () => {
    expect(digest(mergeState(mergeState(sa, sb), sc)))
      .toBe(digest(mergeState(sa, mergeState(sb, sc))));
  });
});

describe("randomized SEC fuzz", () => {
  it("any concurrent history converges across 4 replicas", () => {
    for (let trial = 0; trial < 25; trial++) {
      const rng = mulberry32(trial + 1);
      const reps = ["A", "B", "C", "D"].map((id, i) => makeReplica(id, i * 100));
      const ids = ["c1", "c2", "c3"];

      for (let step = 0; step < 80; step++) {
        const r = reps[Math.floor(rng() * reps.length)];
        const id = ids[Math.floor(rng() * ids.length)];
        const roll = rng();
        if (roll < 0.6) r.setField(id, FIELDS[Math.floor(rng() * FIELDS.length)], `v${Math.floor(rng() * 5)}`);
        else if (roll < 0.74) r.addTag(id, `t${Math.floor(rng() * 4)}`);
        else if (roll < 0.84) r.removeTag(id, `t${Math.floor(rng() * 4)}`);
        else if (roll < 0.92) r.remove(id);
        else r.restore(id);

        if (rng() < 0.3) {
          const a = reps[Math.floor(rng() * reps.length)];
          const b = reps[Math.floor(rng() * reps.length)];
          if (a !== b) {
            const sa = a.snapshot();
            a.merge(b.snapshot());
            b.merge(sa);
          }
        }
      }

      // anti-entropy to quiescence: everyone merges everyone for a few rounds
      for (let round = 0; round <= reps.length; round++) {
        const snaps = reps.map((r) => r.snapshot());
        reps.forEach((r) => snaps.forEach((s) => r.merge(s)));
      }

      const want = digest(reps[0].state);
      for (const r of reps) expect(digest(r.state)).toBe(want);
      // sanity: digest equals a fresh materialize of the merged state
      expect(JSON.stringify(materialize(reps[0].state))).toBe(want);
    }
  });
});
