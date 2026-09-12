import fs from 'node:fs/promises';
import path from 'node:path';

export async function loadJson<T>(filePath: string): Promise<T> {
  const absolute = path.resolve(filePath);
  const text = await fs.readFile(absolute, 'utf8');
  return JSON.parse(text) as T;
}
