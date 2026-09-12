import { AcademicUnavailableError, curriculumRepository } from '@/features/curriculum/repository';
import { offlinePackages } from '@/features/offline/packages';

export async function loadReader({ lessonId, chapterId, preview = false, offline = false }: { lessonId?: string; chapterId?: string; preview?: boolean; offline?: boolean }) {
  const cached = async () => chapterId ? offlinePackages.readChapterReader(chapterId) : lessonId ? offlinePackages.readReader(lessonId) : null;
  if (offline && !preview) {
    const bundle = await cached();
    if (bundle) return { bundle, offlineCopy: true };
    throw new AcademicUnavailableError('A complete downloaded copy is not available. Connect to the internet and download this chapter again.');
  }
  try {
    let target = lessonId;
    if (chapterId) {
      if (preview) await curriculumRepository.requireReviewer();
      const outline = await curriculumRepository.getOutline(chapterId, preview);
      target = outline.flatMap((entry) => entry.lessons)[0]?.id;
    }
    if (!target) throw new AcademicUnavailableError('This chapter has no readable lesson content yet.');
    return { bundle: await curriculumRepository.getReader(target, preview), offlineCopy: false };
  } catch (cause) {
    // Review drafts and explicit academic access denials never fall back to a cache.
    if (!preview && !(cause instanceof AcademicUnavailableError)) {
      const bundle = await cached();
      if (bundle) return { bundle, offlineCopy: true };
    }
    throw cause;
  }
}

export async function loadReaderVersion(lessonId: string, preview: boolean, offlineCopy: boolean) {
  if (!offlineCopy || preview) return curriculumRepository.getLatestContent(lessonId, preview);
  const cached = await offlinePackages.readReader(lessonId);
  if (!cached) throw new AcademicUnavailableError('This section is not in the downloaded copy. Reconnect and download the chapter again.');
  return cached.version;
}
