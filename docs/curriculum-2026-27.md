# Averiq Curriculum Backend — 2026–27

## Coverage

Supabase contains structured draft academic content for Classes 6–12 across CBSE and CISCE/ISC.

Senior-secondary coverage includes the major Science, Commerce and Humanities pathways.

### CBSE Classes 11–12

The senior-secondary release includes:

- English Core
- Physics
- Chemistry
- Mathematics
- Biology
- Computer Science
- Informatics Practices
- Accountancy
- Business Studies
- Economics
- Entrepreneurship
- History
- Political Science
- Geography
- Sociology
- Psychology
- Physical Education

### ISC Classes 11–12

The senior-secondary release includes:

- English
- Physics
- Chemistry
- Mathematics
- Biology
- Computer Science
- Accounts
- Commerce
- Business Studies
- Economics
- History
- Political Science
- Geography
- Sociology
- Psychology

## Stream paths

The active onboarding catalogue supports these major paths for both boards:

- Science: PCM
- Science: PCB
- Science: PCMB
- Commerce with Mathematics
- Commerce without Mathematics
- Humanities / Arts

Optional subjects remain controlled by the onboarding catalogue and the student's saved `student_subjects` rows.

## Content structure

Academic content uses:

`curriculum_releases -> curriculum_subjects -> chapters -> topics -> lessons -> lesson_versions`

Each lesson version can contain normalized:

- content blocks
- key terms
- formulas
- worked examples
- exercises
- provenance sources
- validation checks
- future visual asset mappings

The current v2 curriculum seeder creates separate concept explanations, applications, misconceptions, exam notes, detailed revision, quick revision, two worked examples and five practice-question types for each seeded unit.

## Publication policy

Generated academic content must remain `draft` until validation and review are complete.

Do not bulk-change AI-generated versions to `published`, `approved` or `verified` merely because ingestion succeeded.

Student-facing code must continue to request only published releases/versions.

## Frontend resolution

Use `resolveMyCurriculum()` from `src/services/curriculumService.ts` for signed-in students.

The underlying `resolve_my_curriculum()` RPC resolves:

- authenticated user
- board
- class
- academic year
- latest published verified release
- selected student subjects

This prevents a student from receiving an unrelated board/class/stream catalogue.

## Admin ingestion

Use the server/local content engine in `scripts/content-engine/`.

The admin client requires a Supabase service-role key and must never be imported into browser code.

`seedSubject()` now uses the server-only `seed_subject_units_v2` RPC for high-volume detailed ingestion.

## Visual phase

Text content is intentionally independent of visuals. Diagrams, maps, graphs, animation and 2D/3D assets should attach later through the existing content-asset mapping tables and visual-slot system rather than being embedded into the textual curriculum.
