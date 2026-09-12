// src/lib/safeQuery.ts
export async function safeQuery<T>(
  label: string,
  run: () => PromiseLike<{ data: T | null; error: { code?: string; message: string } | null }>,
  fallback: T,
): Promise<T> {
  try {
    const { data, error } = await run();
    if (error) {
      // 42P01 = undefined_table, PGRST202 = undefined function
      const missing = error.code === "42P01" || error.code === "PGRST202";
      console.warn(`[averiq] ${label} ${missing ? "MISSING IN DB" : "failed"}:`, error.message);
      return fallback;
    }
    return data ?? fallback;
  } catch (e) {
    console.warn(`[averiq] ${label} threw:`, e);
    return fallback;
  }
}
