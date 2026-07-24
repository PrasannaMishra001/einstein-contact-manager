# Turning Einstein into a Local-First, Conflict-Free Contact System

> A distributed-systems extension plan. The goal: stop being "a CRUD app with a
> one-way live feed" and become a **local-first, offline-capable, multi-device
> system that merges concurrent edits with zero conflicts** — and do something
> genuinely novel on top (CRDT-native deduplication). This is the part that turns
> the project from "basic" into a systems contribution you can write up.

---

## 1. The thesis (what's actually new)

Today a contact is a mutable SQL row. Two devices editing the same contact while
one is offline = a lost update or a manual conflict. "Real-time sync" is just a
server pushing Server-Sent Events one way. That's the weakness you felt.

**The upgrade, in three layers of ambition:**

1. **Local-first + offline.** Every device keeps a full local replica
   (IndexedDB). All reads/writes hit the local replica first → instant UI, works
   on a plane. The server becomes a **sync relay + durable backup**, not the
   source of truth. (Kleppmann et al., *Local-first software*.)

2. **Conflict-free merge with CRDTs.** Model each contact as a CRDT (a
   map of last-writer-wins / multi-value registers, with an add-wins set for
   tags). Concurrent edits from N offline devices **converge to the same state**
   with no coordination and no "which version do you want?" dialog. Causality is
   tracked with **version vectors**; deletes use **tombstones**.

3. **The novel bit — CRDT-native entity resolution.** Your existing "smart
   dedup & merge" is currently a server-side, one-shot operation. Re-express
   *merge itself as a CRDT operation* so that "contact A and B are the same
   person" is a commutative, idempotent fact that converges across replicas —
   even if two devices merge overlapping duplicate sets while offline. Merging
   records inside a CRDT while preserving causal history is an open, lightly
   explored problem → this is your paper/BTP angle, and it's **not AI-centric**,
   it's distributed data structures.

---

## 2. Systems concepts you'll demonstrate (the syllabus payoff)

- **Consistency models**: strong vs **eventual** vs **causal** consistency; why
  CRDTs give *Strong Eventual Consistency* (SEC).
- **Logical clocks**: Lamport timestamps, **version/vector clocks**, happens-before.
- **Replication**: op-based vs **state-based (δ-state)** CRDTs; anti-entropy.
- **CAP / PACELC** in practice: you choose AP (available + partition-tolerant).
- **Sync protocols**: delta exchange, Merkle-tree reconciliation for "what do I
  not have?", idempotent re-delivery.
- **Storage**: append-only op log + compaction; tombstone garbage collection.

That list maps cleanly onto OS/CN/DBMS/distributed-systems coursework — exactly
your strong zone.

---

## 3. How it grafts onto *this* codebase

Current seams (from `docs/ARCHITECTURE.md`):
- Writes are destructive `UPDATE`s in `api/contacts.py`.
- `models/contact_history` already stores `old_data`/`new_data` JSON — a baby
  step toward an op log.
- `api/sse.py` already has a live channel — reuse it as the sync transport.
- `entity_resolution.py` already scores duplicates — becomes the merge oracle.

Target architecture:

```
 Device A (offline-capable)         Server (relay + backup)        Device B
 ─────────────────────────         ───────────────────────        ─────────
 IndexedDB replica                  Postgres: ops table             IndexedDB replica
  └ CRDT doc per user                (append-only, per user)         └ CRDT doc
  └ local op log                          ▲   │                       └ local op log
        │ generate op                     │   │ fan-out deltas              ▲
        ▼                                 │   ▼                             │
   /api/sync (POST deltas) ───────────────┘   └──► SSE /api/sync/stream ────┘
```

- **Client**: a CRDT document per user (all their contacts). Mutations produce
  **ops** appended to a local log and applied locally at once.
- **Transport**: `POST /api/sync` uploads new ops; the server stores them and
  fans out to other devices over the existing **SSE** channel. A version vector
  in each direction tells each side what the other is missing (anti-entropy).
- **Server**: dumb and durable. An `ops(user_id, op_id, lamport, payload)`
  append-only table replaces destructive updates. A periodic job materializes
  the current contact state into the existing `contacts` table for fast
  list/search (so AI search / analytics keep working unchanged).

---

## 4. Build it in phases (each phase is demoable)

**Phase 0 — spike (1 week).** Wire **Automerge** (or **Yjs**) into the frontend
for the contact list only. Prove: edit offline on two tabs, reconnect, watch them
converge. This de-risks everything and gives an instant "wow" demo.

**Phase 1 — local-first reads/writes. ✅ Done.** The real `/contacts` page now
reads from an IndexedDB-backed CRDT `Replica`: it hydrates instantly, does
search/sort/pagination client-side, and works fully offline. Writes apply to the
replica immediately and queue for the server, replaying on reconnect (with
temp-id → server-id remap for contacts created offline). A `BroadcastChannel`
keeps tabs in sync, and the page auto-falls back to the plain server path if the
local layer can't initialise. Code: `frontend/lib/contacts/localStore.ts`,
`frontend/lib/localdb.ts`, `frontend/lib/contacts/useLocalContacts.ts`.

> **Honest caveat.** The server is not yet CRDT-aware (no HLC, no ops table), so
> Phase 1 sync is *"local pending edits win; a server pull is authoritative for
> everything not queued."* True multi-writer conflict-free merge across devices
> arrives with the Phase 2 `/api/sync` endpoint below. Photo upload stays
> online-only (Cloudinary).

**Phase 2 — sync protocol.** Implement `/api/sync` (delta upload) + SSE
fan-out + version-vector anti-entropy + tombstones. Handle re-delivery
idempotently. Materialize ops → `contacts` for search/analytics.

**Phase 3 — the research contribution (CRDT-native merge).** Define a
`merge(a, b)` op that is commutative + idempotent and survives concurrent /
overlapping merges. Feed candidates from `entity_resolution.py`. Prove
convergence under adversarial offline-merge interleavings.

**Phase 4 — hardening.** Tombstone GC / log compaction; encrypt the op payloads
(optional E2E); benchmark.

> **Chosen flagship direction: peer-to-peer sync over WebRTC.** After Phase 1
> (local-first `/contacts`), the standout next step is to let two devices sync
> their replicas **directly over a WebRTC data channel** — exchanging CRDT deltas
> with no backend round-trip. The server is demoted to a *signaling relay* that
> only helps peers find each other; once connected, contacts sync device-to-device
> and keep working on a LAN with no internet. This is the "no cloud needed" demo
> and the strongest distributed-systems story on top of the existing CRDT engine.
> δ-state sync and end-to-end encryption follow naturally from there.

**Decision — library vs from scratch?** For a *systems* showcase, implement the
core CRDT (LWW-map + add-wins set + version vectors) **yourself** for Phases 1–3,
and keep Automerge as the Phase-0 baseline you benchmark against. Hand-rolling
the data structure is where the learning and the paper live; Automerge proves
you also know the state of the art.

---

## 5. What makes it paper/BTP-worthy (evaluation plan)

Concrete, quantitative claims you can defend:
- **Convergence correctness**: property-based tests — apply a random op set in
  every permutation across N replicas, assert identical final state (SEC).
- **Throughput**: ops/sec applied and synced; compare your CRDT vs Automerge vs
  Yjs (the literature reports 26K–156K ops/sec — gives you a target).
- **Offline resilience**: merge after T hours offline / K concurrent edits, 0
  conflicts, measured convergence latency on reconnect.
- **Bandwidth**: δ-state vs full-state sync bytes; Merkle reconciliation savings.
- **Novelty**: formal argument + tests that `merge` (entity resolution) preserves
  SEC under concurrent overlapping merges — the open-problem angle.

---

## 6. Reading list (start here, all systems / non-AI)

- Kleppmann, Wiggins, van Hardenberg, McGranaghan — **"Local-first software: You
  own your data, in spite of the cloud"** (Onward! 2019). The manifesto.
  https://martin.kleppmann.com/papers/local-first.pdf
- Ink & Switch essay version: https://www.inkandswitch.com/essay/local-first/
- Shapiro, Preguiça, Baquero, Zawirski — **"Conflict-free Replicated Data Types"**
  (the foundational CRDT paper) and the δ-state CRDT follow-ups (Almeida et al.).
- Kleppmann — **"CRDTs: The Hard Parts"** talk (tombstones, interleaving, GC):
  https://martin.kleppmann.com/2020/07/06/crdt-hard-parts-hydra.html
- Weidner et al. — **Collabs: A Flexible and Performant CRDT Collaboration
  Framework** (arXiv 2212.02618): https://arxiv.org/pdf/2212.02618
- Haas et al. — **LoRe: A Programming Model for Verifiably Safe Local-First
  Software** (arXiv 2304.07133): https://arxiv.org/pdf/2304.07133
- Reference implementations: Automerge (https://automerge.org), Yjs
  (https://yjs.dev), and the CRDT catalogue at https://crdt.tech.
- Kleppmann, *Designing Data-Intensive Applications* — Ch. 5 (Replication) &
  Ch. 9 (Consistency) for the textbook grounding.

---

## 7. Resume bullet, rewritten (for when it's built)

> **Einstein — Local-First Contact System** · Re-architected a cloud contact
> manager into a **local-first, offline-capable** system using a custom
> **conflict-free replicated data type** (LWW-map + add-wins set + version
> vectors) with a δ-state sync protocol over SSE; contacts converge across
> devices with **zero merge conflicts** after arbitrary offline edits. Designed
> a novel **CRDT-native entity-resolution merge** that preserves strong eventual
> consistency under concurrent deduplication. *(Next.js, FastAPI, PostgreSQL,
> IndexedDB)*

This reads as distributed-systems engineering, which is the identity you want.
