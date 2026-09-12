export type ErrorCode =
  | 'AUTH_ERROR'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_ERROR'
  | 'NOT_FOUND'
  | 'UNKNOWN_ERROR';

const messages: Record<ErrorCode, string> = {
  AUTH_ERROR:
    'Your session could not be verified. Please try again.',

  NETWORK_ERROR:
    'We could not connect. Check your connection and try again.',

  VALIDATION_ERROR:
    'Some information needs checking. Please review your input.',

  PERMISSION_ERROR:
    'You do not have permission to access this resource.',

  NOT_FOUND:
    'The requested resource could not be found.',

  UNKNOWN_ERROR:
    'Something went wrong. Please try again.',
};

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    cause?: unknown,
  ) {
    super(messages[code], { cause });
    this.name = 'AppError';
  }
}

export function toAppError(
  error: unknown,
  fallback: ErrorCode = 'UNKNOWN_ERROR',
): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const record =
    typeof error === 'object' && error !== null
      ? error
      : {};

  const status =
    'status' in record
      ? Number(record.status)
      : undefined;

  const name =
    'name' in record
      ? record.name
      : undefined;

  const fetchFailure =
    error instanceof TypeError &&
    /fetch|network|load failed/i.test(error.message);

  if (
    name === 'AuthRetryableFetchError' ||
    fetchFailure
  ) {
    return new AppError('NETWORK_ERROR', error);
  }

  const codes: Record<number, ErrorCode> = {
    400: 'VALIDATION_ERROR',
    401: 'AUTH_ERROR',
    403: 'PERMISSION_ERROR',
    404: 'NOT_FOUND',
    422: 'VALIDATION_ERROR',
  };

  const code = status
    ? codes[status] ?? fallback
    : fallback;

  return new AppError(code, error);
}
