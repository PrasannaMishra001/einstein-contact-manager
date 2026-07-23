# Changelog

The real evolution of Einstein, taken from the commit history. Dates are the
actual commit dates — nothing here is reconstructed after the fact.

Format loosely follows [Keep a Changelog](https://keepachangelog.com).

---

## [Phase 0 — Local-first foundations] · 2026-06-27

The start of turning Einstein from a conventional client/server CRUD app into a
**local-first, conflict-free system**. This phase is deliberately isolated: it
adds a self-contained CRDT module and a demo, and changes no existing product
behaviour. Roadmap in [`docs/CRDT-OFFLINE-SYNC.md`](docs/CRDT-OFFLINE-SYNC.md).

### Added
- **Hand-rolled CRDT core** (`frontend/lib/crdt/`), written from the papers
  rather than pulled from a library, so the data structure is the contribution:
  - `hlc.ts` — Hybrid Logical Clock (Kulkarni et al., 2014): physical time +
    logical counter + node-id tiebreak, giving a **total order** across replicas
    that stays close to real time and survives clock skew.
  - `lww.ts` — last-writer-wins register and field map. Concurrent edits to
    *different* fields of a contact both survive; same-field edits resolve
    deterministically.
  - `or-set.ts` — add-wins **Observed-Remove Set** for tags (Shapiro et al.,
    2011). LWW is unsound for set membership: a stale remove must not erase a
    concurrent add, so removes may only tombstone tokens they have observed.
  - `contact-store.ts` — `ContactDoc` (LWW fields + OR-Set tags + LWW tombstone),
    `mergeState`, `materialize`, and a `Replica` representing one device.
- **Convergence test suite** (`crdt.test.ts`, Vitest) proving the three
  join-semilattice laws (commutative, associative, idempotent) and therefore
  **Strong Eventual Consistency** — plus a seeded randomized fuzz that runs
  concurrent histories across 4 replicas and asserts byte-identical convergence.
- **Public interactive demo** at [`/crdt-demo`](frontend/app/crdt-demo/page.tsx):
  two replicas side by side, per-device online/offline toggles, live HLC stamps
  under each field, and localStorage persistence so a device can genuinely stay
  "offline" across a page reload. No login and no backend required.
- Design notes in [`frontend/lib/crdt/README.md`](frontend/lib/crdt/README.md)
  covering why HLC over Lamport, why LWW for fields but add-wins for tags, and
  why Phase 0 is state-based (CvRDT) with δ-state deferred to Phase 2.
- `npm test` / `npm test:watch` scripts (Vitest).

---

## [Dark theme + documentation] · 2026-06-27

### Fixed
- **Dark mode was substantially broken on the landing page.** Around 22
  `text-black` and 9 `bg-white` utility classes had no `dark:` variant, so in
  dark mode black text rendered on a near-black background (invisible) while
  white cards stayed glaring white. All occurrences now adapt.
- The **register page ignored dark mode entirely** — it always rendered a bright
  cyan background with a white card, so inherited near-white text became
  unreadable. Brought to parity with the login page.

### Changed
- Replaced the flat monochrome-grey dark palette with **"Midnight Indigo"**: a
  deliberate night counterpart to the light theme — deep blue-black canvas,
  indigo-tinted surfaces, the signature yellow retained as a warm glow, and
  bright neo-brutalist accents preserved.
- Neo-brutalist offset shadows are re-mapped in dark mode (they are hard-coded
  black and would otherwise vanish against a dark canvas).
- Login page neutrals realigned to the indigo palette for cohesion.

### Added
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — full walkthrough: request
  lifecycle, frontend/backend structure, the seven-table data model, how each
  headline feature is implemented, deployment topology, and the Render
  free-tier cold-start behaviour (a ~45 s first request after idle, which makes
  login *look* broken while the service wakes).
- [`docs/CRDT-OFFLINE-SYNC.md`](docs/CRDT-OFFLINE-SYNC.md) — the five-phase plan
  to make the app local-first, including the novel angle: expressing
  deduplication **merge itself** as a CRDT operation that converges under
  concurrent, overlapping merges.

---

## [Production hardening] · 2026-03-11

### Added
- Google Contacts full two-way sync.
- PostgreSQL column migrations; PWA icons; sample-account seed script.

### Fixed
- Contact form validation.
- Render deployment: pinned Python 3.12 and corrected production initialisation.
- Restored missing library files; general cleanup and a rewritten README.

---

## [Feature build-out] · 2026-03-08 → 2026-03-10

### Added
- **Full-stack rewrite** — the project moved from a standalone tool to a
  FastAPI + Next.js application: `backend/` (FastAPI, async SQLAlchemy, Alembic
  migrations, Dockerfile), a Next.js frontend, and CI workflows for both.
- Major feature upgrade: AI natural-language search, duplicate detection and
  merge, business-card OCR, import/export, analytics, reminders, webhooks,
  sharing, and server-sent events for live updates.
- Setup guide.

### Fixed
- Assorted bugs across the service layer.

---

## [Origins — CLI era] · 2025-08-17

Einstein did not start as a web app. The first release was a **Python
command-line contact manager packaged as a standalone executable** with
PyInstaller, built and published through GitHub Actions.

### Added
- Initial CLI, `build_executable.py`, packaging and release workflow.
- Embedded credentials support, npm-based distribution, README and licence.
