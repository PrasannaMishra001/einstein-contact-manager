/**
 * Contact CRDT + Replica
 * ----------------------
 * A `ContactDoc` is a small composite CRDT:
 *   - fields  : an LWW field map  (name, phone, email, …) — see lww.ts
 *   - tags    : an add-wins OR-Set                        — see or-set.ts
 *   - deleted : an LWW boolean register (a tombstone)
 * Because each part is a join-semilattice, the composite is too, so merging two
 * `ReplicaState`s is itself conflict-free and order-independent.
 *
 * A `Replica` is one device. It owns an HLC, applies *local* mutations
 * immediately (local-first: the UI never waits for a server), and `merge()`s
 * snapshots from other replicas. This is a state-based (CvRDT) design: replicas
 * exchange whole snapshots and join them. Phase 2 swaps this for δ-state +
 * version vectors so only the changed bits travel — but the convergence math is
 * identical, which is why Phase 0 hard-codes full-state merge: it's the easiest
 * thing to prove correct.
 */

import { HLC, HLCTimestamp, compareHLC } from "./hlc";
import { FieldMap, LWWRegister, mergeFieldMap, mergeRegister, readFields } from "./lww";
import {
  ORSet, addElement, emptyORSet, mergeORSet, mintToken, readORSet, removeElement,
} from "./or-set";

export const CONTACT_FIELDS = ["name", "phone", "email", "company", "jobTitle", "notes"] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

export interface ContactDoc {
  id: string;
  fields: FieldMap;
  tags: ORSet;
  deleted: LWWRegister<boolean>;
}

export interface ReplicaState {
  docs: Record<string, ContactDoc>;
}

export interface MaterializedContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  jobTitle: string;
  notes: string;
  tags: string[];
}

const ZERO_TS = (node: string): HLCTimestamp => ({ millis: 0, counter: 0, node });

/** Join two contact docs, part by part. */
export function mergeDoc(a: ContactDoc, b: ContactDoc): ContactDoc {
  return {
    id: a.id,
    fields: mergeFieldMap(a.fields, b.fields),
    tags: mergeORSet(a.tags, b.tags),
    deleted: mergeRegister(a.deleted, b.deleted),
  };
}

/** Join two replica states: union of doc ids, per-id `mergeDoc`. */
export function mergeState(a: ReplicaState, b: ReplicaState): ReplicaState {
  const docs: Record<string, ContactDoc> = {};
  for (const id of Object.keys(a.docs)) docs[id] = a.docs[id];
  for (const id of Object.keys(b.docs)) {
    docs[id] = id in docs ? mergeDoc(docs[id], b.docs[id]) : b.docs[id];
  }
  return { docs };
}

/** Conflict-resolved view of a state (the join's "read"). Deterministic order. */
export function materialize(state: ReplicaState): MaterializedContact[] {
  const out: MaterializedContact[] = [];
  for (const doc of Object.values(state.docs)) {
    if (doc.deleted.value) continue;
    const f = readFields(doc.fields);
    out.push({
      id: doc.id,
      name: String(f.name ?? ""),
      phone: String(f.phone ?? ""),
      email: String(f.email ?? ""),
      company: String(f.company ?? ""),
      jobTitle: String(f.jobTitle ?? ""),
      notes: String(f.notes ?? ""),
      tags: readORSet(doc.tags),
    });
  }
  return out.sort((x, y) => (x.id < y.id ? -1 : 1));
}

/** A canonical string for two states' *observable* content — used to assert convergence. */
export function digest(state: ReplicaState): string {
  return JSON.stringify(materialize(state));
}

export class Replica {
  readonly clock: HLC;
  state: ReplicaState = { docs: {} };

  constructor(readonly nodeId: string, physical?: () => number) {
    this.clock = new HLC(nodeId, physical);
  }

  private ensure(id: string): ContactDoc {
    let doc = this.state.docs[id];
    if (!doc) {
      doc = { id, fields: {}, tags: emptyORSet(), deleted: { value: false, ts: ZERO_TS(this.nodeId) } };
      this.state.docs[id] = doc;
    }
    return doc;
  }

  create(id: string, initial: Partial<Record<ContactField, string>> = {}): void {
    this.ensure(id);
    for (const [k, v] of Object.entries(initial)) this.setField(id, k as ContactField, v ?? "");
  }

  setField(id: string, field: ContactField, value: string): void {
    const doc = this.ensure(id);
    doc.fields = { ...doc.fields, [field]: { value, ts: this.clock.now() } };
  }

  addTag(id: string, tag: string): void {
    const doc = this.ensure(id);
    doc.tags = addElement(doc.tags, tag, mintToken(this.nodeId));
    this.clock.now();
  }

  removeTag(id: string, tag: string): void {
    const doc = this.ensure(id);
    doc.tags = removeElement(doc.tags, tag);
    this.clock.now();
  }

  remove(id: string): void {
    const doc = this.ensure(id);
    doc.deleted = { value: true, ts: this.clock.now() };
  }

  restore(id: string): void {
    const doc = this.ensure(id);
    doc.deleted = { value: false, ts: this.clock.now() };
  }

  /** State-based join: fold a remote snapshot in, then advance our clock past it. */
  merge(remote: ReplicaState): void {
    this.state = mergeState(this.state, remote);
    let max: HLCTimestamp | null = null;
    for (const doc of Object.values(remote.docs)) {
      for (const reg of Object.values(doc.fields)) {
        if (!max || compareHLC(reg.ts, max) > 0) max = reg.ts;
      }
      if (!max || compareHLC(doc.deleted.ts, max) > 0) max = doc.deleted.ts;
    }
    if (max) this.clock.receive(max);
  }

  /** Serializable deep copy to "send over the wire". */
  snapshot(): ReplicaState {
    return JSON.parse(JSON.stringify(this.state)) as ReplicaState;
  }

  /** Replace local state (e.g. hydrate from IndexedDB) — Phase 1 will use this. */
  load(state: ReplicaState): void {
    this.state = JSON.parse(JSON.stringify(state)) as ReplicaState;
  }

  contacts(): MaterializedContact[] {
    return materialize(this.state);
  }
}
