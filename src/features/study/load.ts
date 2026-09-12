import { curriculumRepository } from '@/features/curriculum/repository';
import type { Chapter, CurriculumSubject, Subject, Topic } from '@/features/curriculum/model';
import { parseStudyDocument, type StudyLesson } from './model';

export type StudyCatalog = { subjects: CurriculumSubject[]; placement?: CurriculumSubject; subject?: Subject; chapters: Chapter[]; chapter?: Chapter; topic?: Topic };
export type StudyContent = { lessons: StudyLesson[]; unavailable: number };

export async function loadStudyCatalog(subjectId: string | null, chapterId: string | null, topicId: string | null = null): Promise<StudyCatalog> {
  const resolution = await curriculumRepository.resolveMyCurriculum();
  let topic: Topic | undefined;
  if (topicId) {
    topic = await curriculumRepository.getTopic(topicId);
    const topicChapter = await curriculumRepository.getChapter(topic.chapter_id);
    if (topic.status !== 'published' || topicChapter.status !== 'published' ||
        (subjectId && subjectId !== topicChapter.curriculum_subject_id) || (chapterId && chapterId !== topic.chapter_id)) {
      return { subjects: resolution.subjects, chapters: [] };
    }
    subjectId = topicChapter.curriculum_subject_id;
    chapterId = topic.chapter_id;
  }
  const placement = subjectId ? resolution.subjects.find((item) => item.id === subjectId) : resolution.subjects[0];
  if (!placement) return { subjects: resolution.subjects, chapters: [] };
  const [allChapters, subject] = await Promise.all([
    curriculumRepository.getChapters(placement.id), curriculumRepository.getSubject(placement.subject_id),
  ]);
  const chapters = allChapters.filter((item) => item.status === 'published');
  const chapter = chapterId ? chapters.find((item) => item.id === chapterId) : chapters[0];
  return { subjects: resolution.subjects, placement, subject, chapters, chapter, topic };
}

export async function loadStudyContent(chapterId: string, active: () => boolean = () => true, topicId?: string): Promise<StudyContent> {
  const outline = await curriculumRepository.getOutline(chapterId);
  const metadata = outline.filter((item) => !topicId || item.topic.id === topicId).flatMap((item) => item.lessons);
  const lessons: StudyLesson[] = [];
  let unavailable = 0;
  // Only the selected chapter; at most four access-checked lesson requests at once.
  for (let offset = 0; offset < metadata.length && active(); offset += 4) {
    const batch = await Promise.allSettled(metadata.slice(offset, offset + 4).map(async (lesson) => {
      const version = await curriculumRepository.getLatestContent(lesson.id);
      const resources = version.content_schema_version >= 3
        ? await curriculumRepository.getStudyResources(version.id)
        : undefined;
      return { lesson, document: parseStudyDocument(version.content), resources };
    }));
    for (const result of batch) {
      if (result.status === 'fulfilled') lessons.push(result.value);
      else unavailable += 1;
    }
  }
  return { lessons, unavailable };
}