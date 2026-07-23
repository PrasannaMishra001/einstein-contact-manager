# CRDT core — design notes (Phase 0)

This module is the foundation for making Einstein **local-first**: every device
holds a full replica, reads and writes hit that replica immediately (so the UI
never waits on a network round-trip and works offline), and replicas reconcile
by *merging* rather than by "last request to reach the server wins."

Roadmap: [`docs/CRDT-OFFLINE-SYNC.md`](../../../docs/CRDT-OFFLINE-SYNC.md).
Live demo: [`/crdt-demo`](../../app/crdt-demo/page.tsx).

---

## The core guarantee

A CRDT's merge is a **join on a semilattice**, which means it obeys three laws:

| law | meaning | why it matters |
|---|---|---|
| commutative | `merge(a,b) = merge(b,a)` | sync order doesn't matter |
| associative | `merge(merge(a,b),c) = merge(a,merge(b,c))` | grouping doesn't matter |
| idempotent | `merge(a,a) = a` | re-delivering the same data is harmless |

Together they give **Strong Eventual Consistency (SEC)**: any two replicas that
have observed the same set of updates are in the same state, *regardless of the
order or number of times they saw them*. That is what removes conflicts by
construction — there is no merge dialog, because there is no conflict.

`crdt.test.ts` asserts all three laws directly, then fuzzes 4 replicas with
randomized concurrent histories (80 ops × 25 trials, seeded/reproducible) and
asserts every replica converges to a byte-identical materialized state.

---

## Why a Hybrid Logical Clock (`hlc.ts`)

To resolve "who wrote last" you need to order events across machines.

- **Wall clock alone** is unsafe: clocks skew, and two writes in the same
  millisecond tie.
- **Lamport clock alone** is safe but loses any relationship to real time, so
  "latest" can feel arbitrary to a user.
- **HLC** keeps physical time as the leading component, adds a logical counter
  for same-millisecond events, and appends the **node id** as a final tiebreak.

That last part matters: it makes the order **total**, so two replicas can never
derive different winners from the same pair of timestamps. `receive()` folds a
remote timestamp into the local clock so anything written afterwards is causally
*after* what we just observed (Kulkarni et al., 2014).

> Note: convergence does **not** depend on clocks being synchronised. Clock skew
> only influences *which* concurrent write wins — never *whether* replicas agree.

---

## Why LWW for fields but OR-Set for tags

**Fields (`lww.ts`)** — a contact is a map of independent
last-writer-wins registers. Two devices editing *different* fields (one edits
phone, the other edits email) both keep their change: there is no false conflict,
because each field is its own register. Editing the *same* field is settled
deterministically by HLC.

**Tags (`or-set.ts`)** — LWW is the *wrong* answer for set membership. If device
A adds `work` while device B concurrently removes it, a single LWW flag lets a
stale remove erase a fresh add. So tags use an **Observed-Remove Set**: every add
mints a unique token, and a remove may only tombstone the tokens it has actually
*observed*. A concurrent add survives, because its token was never seen by that
remove — "add-wins" semantics (Shapiro et al., 2011).

**Deletion** of a whole contact uses an LWW boolean tombstone: the most recent of
delete/restore wins, which is intuitive and easy to explain to a user.

---

## Composition

`contact-store.ts` composes those pieces:

```
ContactDoc = { fields: LWW field map, tags: OR-Set, deleted: LWW bool }
ReplicaState = { docs: Record<id, ContactDoc> }
```

A composite of semilattices is itself a semilattice, so `mergeState` inherits SEC
for free — that is the whole reason for building it this way rather than writing
ad-hoc merge logic.

`Replica` is one device: it owns an HLC, applies local mutations instantly, and
`merge()`s snapshots from peers. `materialize()` projects the CRDT state down to
the plain contact objects the UI renders.

---

## State-based now, δ-state later

Phase 0 is deliberately **state-based (CvRDT)**: replicas exchange whole
snapshots and join them. It is the easiest formulation to prove correct, and
correctness is the point of this phase.

It is also *O(state)* per sync, which is fine for a demo and wrong for
production. Phase 2 replaces the transport with **δ-state** updates plus version
vectors, so only the changed parts travel — without changing any of the merge
semantics above. The convergence math is identical; only the payload shrinks.

## Files

| file | contents |
|---|---|
| `hlc.ts` | Hybrid Logical Clock, total order, `receive()` causality rule |
| `lww.ts` | LWW register, field map, `readFields` |
| `or-set.ts` | add-wins Observed-Remove Set |
| `contact-store.ts` | `ContactDoc`, `mergeState`, `materialize`, `Replica` |
| `crdt.test.ts` | semilattice laws + randomized SEC fuzz |

## References

- Shapiro, Preguiça, Baquero, Zawirski — *Conflict-free Replicated Data Types* (2011)
- Kulkarni et al. — *Logical Physical Clocks…* (2014) — the HLC algorithm
- Kleppmann, Wiggins, van Hardenberg, McGranaghan — *Local-first software* (2019)
