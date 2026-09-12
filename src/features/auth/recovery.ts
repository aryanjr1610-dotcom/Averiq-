const key = 'averiq:password-recovery:v1';

type RecoveryMarker = {
  userId: string;
  expiresAt: number;
};

let memory: RecoveryMarker | null = null;

export function allowPasswordRecovery(userId: string) {
  memory = {
    userId,
    expiresAt: Date.now() + 15 * 60 * 1000,
  };

  try {
    sessionStorage.setItem(key, JSON.stringify(memory));
  } catch {
    // In-memory recovery still works.
  }
}

export function clearPasswordRecovery() {
  memory = null;

  try {
    sessionStorage.removeItem(key);
  } catch {
    // No sensitive credential is stored here.
  }
}

export function canResetPassword(userId: string): boolean {
  let marker = memory;

  try {
    const raw = sessionStorage.getItem(key);

    if (raw) {
      const value: unknown = JSON.parse(raw);

      if (
        typeof value === 'object' &&
        value !== null &&
        'userId' in value &&
        typeof value.userId === 'string' &&
        'expiresAt' in value &&
        typeof value.expiresAt === 'number'
      ) {
        marker = {
          userId: value.userId,
          expiresAt: value.expiresAt,
        };
      }
    }
  } catch {
    // Fall back to memory.
  }

  return Boolean(
    marker &&
    marker.userId === userId &&
    marker.expiresAt > Date.now(),
  );
}
