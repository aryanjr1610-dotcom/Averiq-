import type { CurriculumPackage } from './types';
import { ensureRelease, ensureSubject, ensureChapter, ingestLesson } from './database';

export async function ingestCurriculum(curriculum: CurriculumPackage) {
  console.log(`\nStarting ${curriculum.board_code.toUpperCase()} Class ${curriculum.grade_level}`);
  const releaseId = await ensureRelease(curriculum);
  console.log('Release:', releaseId);

  for (const subject of curriculum.subjects) {
    console.log(`\nSubject: ${subject.title}`);
    const curriculumSubjectId = await ensureSubject(releaseId, subject);

    for (const chapter of subject.chapters) {
      console.log(`\n Chapter ${chapter.chapter_number}: ${chapter.title}`);
      const chapterId = await ensureChapter(curriculumSubjectId, chapter);

      for (const lesson of chapter.lessons) {
        const jobKey = ['averiq', curriculum.academic_year, curriculum.board_code, curriculum.grade_level, subject.slug, chapter.slug, lesson.lesson.slug].join(':');
        console.log(` → ${lesson.lesson.title}`);
        try {
          const result = await ingestLesson(chapterId, lesson, jobKey);
          console.log(` ✓ version ${result.version}`, result.counts);
        } catch (error) {
          console.error(` ✗ Failed:`, error);
        }
      }
    }
  }
  console.log('\nContent ingestion complete.');
}
