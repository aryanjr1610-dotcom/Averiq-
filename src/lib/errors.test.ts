import {
  expect,
  it,
} from 'vitest';

import { toAppError } from './errors';

it('maps network failures', () => {
  const error = toAppError(
    new TypeError('Failed to fetch'),
  );

  expect(error.code).toBe('NETWORK_ERROR');
});

it('maps permission errors without displaying vendor text', () => {
  const error = toAppError({
    status: 403,
    message: 'private internal detail',
  });

  expect(error.code).toBe('PERMISSION_ERROR');
  expect(error.message).not.toContain('private');
});
