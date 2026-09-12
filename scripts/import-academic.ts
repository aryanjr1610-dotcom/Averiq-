import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { createClient } from '@supabase/supabase-js';

import { AcademicImportSchema } from '../src/features/curriculum/import-schema';
import { validateLearningDocument } from '../src/features/learning/content/validate';
import { collectAssetIds } from '../src/features/learning/content/schema';

type Row = Record<string, unknown>;
type Bundle = Record<string, Row[]>;

const namespace = Buffer.from(
  '29f57cbe629e4be6a0a263cd2cf9c249',
  'hex',
);

function stableId(key: string) {
  const bytes = createHash('sha1')
    .update(namespace)
    .update(key)
    .digest()
    .subarray(0, 16);

  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = bytes.toString('hex');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

function digest(value: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

async function main() {
  const path = process.argv[2];

  if (!path) {
    throw new Error('Usage: import-academic.ts <manifest.json>');
  }

  const raw = await readFile(path, 'utf8');

  if (Buffer.byteLength(raw) > 5_000_000) {
    throw new Error('Import exceeds the 5 MB tooling limit.');
  }

  const manifest = AcademicImportSchema.parse(JSON.parse(raw));

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Server-side Supabase environment variables are missing.');
  }

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const bundle: Bundle = {};

  function add(table: string, row: Row) {
    bundle[table] ??= [];

    if (
      row.id &&
      bundle[table]!.some((existing) => existing.id === row.id)
    ) {
      return;
    }

    bundle[table]!.push(row);
  }

  const yearId = stableId(`year:${manifest.academicYear.code}`);
  const boardId = stableId(`board:${manifest.board.code}`);
  const trackId = stableId(`track:${manifest.track.code}`);
  const releaseId = stableId(`release:${manifest.importKey}`);

  add('academic_years', {
    id: yearId,
    code: manifest.academicYear.code,
    label: manifest.academicYear.label,
    start_year: manifest.academicYear.startYear,
    end_year: manifest.academicYear.endYear,
  });

  add('education_boards', {
    id: boardId,
    ...manifest.board,
  });

  add('curriculum_tracks', {
    id: trackId,
    board_id: boardId,
    code: manifest.track.code,
    title: manifest.track.title,
    learning_context: 'school',
    minimum_grade: manifest.track.minimumGrade,
    maximum_grade: manifest.track.maximumGrade,
  });

  add('curriculum_releases', {
    id: releaseId,
    import_key: manifest.importKey,
    academic_year_id: yearId,
    track_id: trackId,
    grade_level: manifest.gradeLevel,
    revision: manifest.revision,
    data_kind: manifest.source.kind,
    source_name: manifest.source.name,
    source_url: manifest.source.url,
    source_document: manifest.source.documentReference,
    source_publication_date: manifest.source.publicationDate,
  });

  for (const combination of manifest.combinations) {
    const streamId = stableId(`stream:${combination.streamCode}`);

    add('academic_streams', {
      id: streamId,
      code: combination.streamCode,
      title: combination.streamTitle,
    });

    add('subject_combinations', {
      id: stableId(`combination:${combination.code}`),
      stream_id: streamId,
      code: combination.code,
      title: combination.title,
    });
  }

  for (const subject of [
    ...manifest.extraSubjects,
    ...manifest.subjects,
  ]) {
    add('subjects', {
      id: stableId(`subject:${subject.code}`),
      code: subject.code,
      title: subject.title,
    });
  }

  for (const asset of manifest.assets) {
    add('content_assets', {
      id: asset.id,
      asset_key: asset.key,
      bucket: 'academic-content',
      object_path: asset.objectPath,
      alt_text: asset.alt,
      credit: asset.credit,
      license_reference: asset.licenseReference,
    });
  }

  for (const subject of manifest.subjects) {
    const placementId = stableId(
      `${manifest.importKey}:subject:${subject.code}`,
    );

    add('curriculum_subjects', {
      id: placementId,
      release_id: releaseId,
      subject_id: stableId(`subject:${subject.code}`),
      title: subject.title,
      slug: subject.slug,
      position: subject.position,
    });

    for (const rule of subject.rules) {
      add('curriculum_subject_rules', {
        id: stableId(`${placementId}:rule:${rule.combinationCode ?? '*'}`),
        curriculum_subject_id: placementId,
        combination_id: rule.combinationCode
          ? stableId(`combination:${rule.combinationCode}`)
          : null,
        requirement_role: rule.role,
      });
    }

    const chapterGroups = [
      { courseId: null as string | null, chapters: subject.chapters },

      ...subject.courses.map((course) => {
        const courseId = stableId(`${placementId}:course:${course.key}`);

        add('courses', {
          id: courseId,
          curriculum_subject_id: placementId,
          title: course.title,
          slug: course.slug,
          position: course.position,
        });

        return { courseId, chapters: course.chapters };
      }),
    ];

    for (const group of chapterGroups) {
      for (const chapter of group.chapters) {
        const chapterId = stableId(`${placementId}:chapter:${chapter.key}`);

        add('chapters', {
          id: chapterId,
          curriculum_subject_id: placementId,
          course_id: group.courseId,
          title: chapter.title,
          slug: chapter.slug,
          chapter_number: chapter.chapterNumber ?? null,
          position: chapter.position,
          description: chapter.description,
          estimated_minutes: chapter.estimatedMinutes ?? null,
        });

        for (const topic of chapter.topics) {
          const topicId = stableId(`${chapterId}:topic:${topic.key}`);

          add('topics', {
            id: topicId,
            chapter_id: chapterId,
            title: topic.title,
            slug: topic.slug,
            position: topic.position,
          });

          for (const lesson of topic.lessons) {
            const lessonId = stableId(`${topicId}:lesson:${lesson.key}`);
            const versionId = stableId(`${lessonId}:version:${lesson.contentVersion}`);
            const document = validateLearningDocument(
              lesson.document,
              subject.code,
            );

            add('lessons', {
              id: lessonId,
              topic_id: topicId,
              title: lesson.title,
              slug: lesson.slug,
              position: lesson.position,
              lesson_type: lesson.lessonType,
              estimated_minutes: lesson.estimatedMinutes ?? null,
            });

            add('lesson_versions', {
              id: versionId,
              lesson_id: lessonId,
              version: lesson.contentVersion,
              content_schema_version: document.schemaVersion,
              content: document,
              content_hash: digest(document),
              author_source: lesson.authorSource,
            });

            for (const assetId of collectAssetIds(document)) {
              add('lesson_version_assets', {
                version_id: versionId,
                asset_id: assetId,
              });
            }
          }
        }
      }
    }
  }

  for (const [legacyKey, subjectCode] of Object.entries(manifest.aliases.subjects)) {
    add('legacy_subject_mappings', {
      id: stableId(`subject-map:${manifest.legacyCatalogVersion}:${legacyKey}`),
      catalog_version: manifest.legacyCatalogVersion,
      legacy_key: legacyKey,
      subject_id: stableId(`subject:${subjectCode}`),
    });
  }

  for (const [legacyKey, combinationCode] of Object.entries(manifest.aliases.combinations)) {
    add('legacy_path_mappings', {
      id: stableId(`path-map:${manifest.legacyCatalogVersion}:${legacyKey}`),
      catalog_version: manifest.legacyCatalogVersion,
      legacy_key: legacyKey,
      combination_id: stableId(`combination:${combinationCode}`),
    });
  }

  const { data, error } = await client.rpc('import_academic_bundle', {
    p_import_key: manifest.importKey,
    p_digest: digest(manifest),
    p_bundle: bundle,
  });

  if (error) throw error;

  console.log(`Draft import completed. Release: ${String(data)}`);
  console.log('Nothing was verified or published. Alias mappings remain pending.');
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Academic import failed.',
  );
  process.exitCode = 1;
});
