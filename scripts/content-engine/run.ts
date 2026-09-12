import type { CurriculumPackage } from './types';
import { loadJson } from './loadJson';
import { ingestCurriculum } from './runner';

async function main() {
  const input = process.argv[2];
  if (!input) {
    throw new Error(['Missing content package.', '', 'Example:', 'npx tsx scripts/content-engine/run.ts content-library/cbse/class-6/science.json'].join('\n'));
  }
  const curriculum = await loadJson<CurriculumPackage>(input);
  await ingestCurriculum(curriculum);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
