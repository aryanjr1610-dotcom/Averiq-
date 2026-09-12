import {
  describe,
  expect,
  it,
} from 'vitest';

import { parseEnvironment } from './env';

const valid = {
  VITE_SUPABASE_URL:
    'https://example.supabase.co',

  VITE_SUPABASE_ANON_KEY:
    'sb_publishable_TEST_ONLY_NOT_A_REAL_KEY',
};

describe('environment safety', () => {
  it('accepts browser configuration', () => {
    const result = parseEnvironment(
      valid,
      true,
    );

    expect(result.supabaseUrl).toBe(
      valid.VITE_SUPABASE_URL,
    );
  });

  it('rejects missing variables with actionable development feedback', () => {
    expect(() => {
      parseEnvironment({}, true);
    }).toThrow('VITE_SUPABASE_URL');
  });

  it('does not show configuration details in production', () => {
    expect(() => {
      parseEnvironment({}, false);
    }).toThrow(
      'Application configuration is unavailable.',
    );
  });

  it('rejects secret keys', () => {
    expect(() => {
      parseEnvironment(
        {
          ...valid,
          VITE_SUPABASE_ANON_KEY:
            'sb_secret_test',
        },
        true,
      );
    }).toThrow('Secret');
  });

  it('rejects service-role JWT keys', () => {
    const payload = btoa(
      JSON.stringify({
        role: 'service_role',
      }),
    );

    const jwt =
      `header.${payload}.signature`;

    expect(() => {
      parseEnvironment(
        {
          ...valid,
          VITE_SUPABASE_ANON_KEY: jwt,
        },
        true,
      );
    }).toThrow('never a service-role');
  });

  it('rejects non-local HTTP', () => {
    expect(() => {
      parseEnvironment(
        {
          ...valid,
          VITE_SUPABASE_URL:
            'http://example.com',
        },
        true,
      );
    }).toThrow('HTTPS');
  });

  it('disables the onboarding override in production', () => {
    const result = parseEnvironment(
      {
        ...valid,
        VITE_DEV_ONBOARDING_COMPLETE: 'true',
      },
      false,
    );

    expect(
      result.devOnboardingComplete,
    ).toBe(false);
  });
});
