import {
  describe,
  expect,
  it,
} from 'vitest';

import { getRedirect } from './access';

import type { Audience } from './access';

type Case = [
  Audience,
  boolean,
  boolean,
  string | null,
];

describe('access policy', () => {
  const cases: Case[] = [
    ['public', false, false, null],
    ['public', false, true, null],

    ['public', true, false, '/onboarding'],
    ['public', true, true, '/app/dashboard'],

    ['onboarding', false, false, '/login'],
    ['onboarding', false, true, '/login'],

    ['onboarding', true, false, null],
    ['onboarding', true, true, '/app/dashboard'],

    ['app', false, false, '/login'],
    ['app', false, true, '/login'],

    ['app', true, false, '/onboarding'],
    ['app', true, true, null],
  ];

  it.each(cases)(
    '%s / authenticated=%s / complete=%s',
    (
      audience,
      authenticated,
      complete,
      expected,
    ) => {
      expect(
        getRedirect(
          audience,
          authenticated,
          complete,
        ),
      ).toBe(expected);
    },
  );
});
