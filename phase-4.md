PHASE 4 ADDENDUM FOR WINDSURF
PROJECT: MemoirArk — Personal Memoir & Life Archive Engine
CURRENT PHASE: Phase 4 — Advanced Search, Collections, Query Builder, Deterministic Insights

================================================================
1. IDENTITY & BOUNDARIES FOR PHASE 4
================================================================
You have completed:
- Phase 1 — Foundation
- Phase 2 — Linking & Entity Expansion
- Phase 3 — Timelines & Export Engine

You are authorized to implement **PHASE 4 ONLY**, which introduces:
- Advanced deterministic search
- A user-defined "Collections" system
- A Query Builder UI for power users
- Deterministic analytical views (pattern surfacing without generation)

You MUST continue obeying:
- The Golden Rule of Determinism (NO inference, NO guessing, NO summarization)
- The existing schema and architecture
- Phase restrictions (do NOT touch Phase 5 features)

================================================================
2. DATA MODEL — PHASE 4 EXTENSIONS
================================================================
Add **Collections** and **Tags** as new optional organizational entities.

------------------------------------------------
A) Model: Tag
------------------------------------------------
Represent lightweight categorical labels.

Fields:
- id (cuid or uuid)
- name (string, required)
- description (string? optional)

Relations:
- events (many-to-many Event)

------------------------------------------------
B) Model: Collection
------------------------------------------------
A deterministic grouping of Events (and optionally Artifacts and People).

Fields:
- id (cuid/uuid)
- name (string, required)
- description (string?, optional)
- createdAt (DateTime, default now)
- updatedAt (DateTime, update timestamp)

Relations:
- events (many-to-many)
- artifacts (many-to-many, optional)
- persons (many-to-many, optional)

Notes:
- Collections DO NOT auto-update.
- Collections DO NOT self-generate.
- User explicitly adds/removes items.

------------------------------------------------
C) Optional Event enhancements
------------------------------------------------
You MAY add:
- `searchNotesIndex` (string?) — searchable text copy of notes  
  (ONLY if user opts-in for full-text search in Phase 4)
- `tagIds` (via join table)
- `collectionIds` (via join table)

Document all new fields in project-rules.md.

================================================================
3. BACKEND — ADVANCED SEARCH ENGINE
================================================================
All search must be deterministic and rule-based.

Implement the following endpoints:

------------------------------------------------
A) Full-Text Search (Optional, Deterministic)
------------------------------------------------
Endpoint:
- `GET /api/search`

Query parameters:
- `q` (string)
- `type` (event|person|artifact|synchronicity|all)
- `in` (title|notes|summary|transcribedText|all)
- Filters matching Phase 3:
  - chapterId
  - traumaCycleId
  - personId
  - tagId
  - dateRange=YYYY-MM-DD..YYYY-MM-DD

Behavior:
- Basic substring or keyword matching.
- NO semantic expansion, no synonyms.
- You may use SQLite FTS5 if configured deterministically, otherwise fallback to LIKE queries.

Response includes:
- Matched items + field highlighting (e.g., “fieldMatch”: “notes”).

------------------------------------------------
B) Structured Filtering (Deterministic Multi-Filter)
------------------------------------------------
Endpoint:
- `POST /api/search/filter`

Payload shape example:
