type EnvironmentInput = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_DEV_ONBOARDING_COMPLETE?: string;
};

export interface Environment {
  supabaseUrl: string;
  supabasePublicKey: string;
  devOnboardingComplete: boolean;
}

export const isDevelopment = import.meta.env.DEV;

export function parseEnvironment(
  input: EnvironmentInput,
  development: boolean,
): Environment {
  const url = input.VITE_SUPABASE_URL?.trim();
  const key = input.VITE_SUPABASE_ANON_KEY?.trim();

  const fail = (detail: string): never => {
    throw new Error(
      development
        ? detail
        : 'Application configuration is unavailable.',
    );
  };

  if (!url || url.includes('YOUR_PROJECT')) {
    fail('Set VITE_SUPABASE_URL in .env.local.');
  }

  if (!key || key.includes('YOUR_BROWSER')) {
    fail('Set VITE_SUPABASE_ANON_KEY in .env.local.');
  }

  // Explicit narrowing for the optional input values.
  if (!url || !key) {
    throw new Error('Application configuration is unavailable.');
  }

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return fail('VITE_SUPABASE_URL must be a valid URL.');
  }

  const local = [
    'localhost',
    '127.0.0.1',
    '[::1]',
  ].includes(parsed.hostname);

  const secureProtocol = parsed.protocol === 'https:';
  const localHttp = local && parsed.protocol === 'http:';

  if (!secureProtocol && !localHttp) {
    fail(
      'Use HTTPS for Supabase; HTTP is allowed only for local development.',
    );
  }

  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== '/'
  ) {
    fail(
      'VITE_SUPABASE_URL must be the project origin, without credentials or a path.',
    );
  }

  if (key.startsWith('sb_secret_')) {
    fail('Secret Supabase keys must never be used in the browser.');
  }

  let browserSafe = key.startsWith('sb_publishable_');

  if (!browserSafe) {
    try {
      const part = key.split('.')[1];

      if (!part) {
        throw new Error('Invalid key');
      }

      const payload: unknown = JSON.parse(
        atob(
          part
            .replace(/-/g, '+')
            .replace(/_/g, '/'),
        ),
      );

      browserSafe =
        typeof payload === 'object' &&
        payload !== null &&
        'role' in payload &&
        payload.role === 'anon';
    } catch {
      browserSafe = false;
    }
  }

  if (!browserSafe) {
    fail(
      'Use a Supabase publishable key or legacy anon key, never a service-role key.',
    );
  }

  const override = input.VITE_DEV_ONBOARDING_COMPLETE;

  if (
    override &&
    override !== 'true' &&
    override !== 'false'
  ) {
    fail(
      'VITE_DEV_ONBOARDING_COMPLETE must be true or false.',
    );
  }

  return {
    supabaseUrl: parsed.origin,
    supabasePublicKey: key,

    // This override cannot become active in a production build.
    devOnboardingComplete:
      development && override === 'true',
  };
}

let cached: Environment | undefined;

export function getEnvironment(): Environment {
  cached ??= parseEnvironment(
    import.meta.env,
    isDevelopment,
  );

  return cached;
}
