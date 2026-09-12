# Averiq — Phase 1

Averiq is an educational platform foundation for school learning
and future competitive-exam preparation.

This phase contains engineering infrastructure only. It does not
implement a finished dashboard, curriculum, lessons, AI or 3D features.

## Stack

- React 19
- TypeScript
- Vite
- React Router
- Supabase
- Framer Motion
- Lucide
- Plain CSS with design tokens
- ESLint
- Vitest

## Requirements

Use Node.js 22.12 or newer and npm.

Install dependencies:

    npm install

Start development:

    npm run dev

Run all quality checks:

    npm run check

Individual commands:

    npm run typecheck
    npm run lint
    npm run test
    npm run build
    npm run preview

Commit package-lock.json after the first successful installation.
Use npm ci in CI once a lockfile has been committed.

Do not scaffold another Vite project inside this directory.

## Environment

Copy .env.example to .env.local.

Configure:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_DEV_ONBOARDING_COMPLETE, optional, defaults to false

VITE_SUPABASE_ANON_KEY accepts a browser-safe Supabase publishable
key or a legacy anon JWT key.

Restart Vite after changing environment values.

Production environment variables must be available when the
frontend is built. Changing deployment environment values without
rebuilding does not update an existing browser bundle.

Key-format validation is not remote credential verification.
Always obtain the browser-safe key from your Supabase project.

## Architecture

Application flow:

    main
      -> ErrorBoundary
      -> App
      -> AppProviders
      -> Router
      -> AppShell
      -> Guards and lazy-loaded pages

Directories:

- src/app: composition, routing, guards and application configuration.
- src/components: reusable UI, layout and feedback.
- src/features/auth: auth provider, hook, actions and data-access service.
- src/lib: vendor adapters and shared error representation.
- src/types: frontend domain contracts.
- src/utils: utilities that are currently used.
- src/styles: tokens, base styles, layouts and primitive styles.

A cross-domain services directory is intentionally not created yet.
Current auth data access belongs to its feature.

Dependency direction:

- The app layer composes features and shared UI.
- Features own business logic, hooks and domain services.
- Shared UI does not query Supabase.
- Domain services use the Supabase adapter.

Generate typed Supabase database definitions when a real schema
exists. No speculative application tables are created in Phase 1.

## Future feature directories

Create these only when their features are implemented:

- onboarding
- dashboard
- curriculum
- learning
- ai-tutor
- revision
- formulas
- practice
- visual-lab
- anatomy
- planner
- focus
- progress
- achievements
- notes
- profile
- settings

Curriculum must come from versioned backend catalogues.
Do not permanently embed chapter or subject catalogues in UI files.

## State ownership

Local state:
Component-specific temporary UI.

URL state:
Navigation and shareable filters.

Server state:
Feature services and hooks. Add one query/cache library later
only when there is a demonstrated need.

Global client state:
Auth, notifications and genuinely application-wide preferences.

No speculative global store is included.

## Routes

The foundation includes:

- /
- /welcome
- /login
- /signup
- /forgot-password
- /onboarding/*
- /app
- /app/dashboard
- A catch-all 404

Authentication, onboarding and app routes currently display
explicit placeholders. They do not pretend to be finished features.

## Authentication and onboarding policy

A visitor can access public routes.

A visitor entering a protected route is sent to /login.

An authenticated user with incomplete onboarding is sent to
/onboarding.

An authenticated, onboarded user is sent to /app/dashboard.

Loading and error states never assume a user is logged out.

Until Phase 4, all authenticated users are treated as incomplete
in production.

For development only, VITE_DEV_ONBOARDING_COMPLETE=true allows
a real restored session to exercise the completed branch.

This override:

- Does not create a user.
- Does not bypass authentication.
- Does not save profile data.
- Does not grant database access.
- Is always disabled in a production build.

Replace onboarding resolution with a protected profile service
in Phase 4. Preserve the pure route policy.

## Session lifecycle

The auth provider:

- Centralizes session state.
- Subscribes to auth events.
- Restores the browser session.
- Cleans up its event subscription.
- Ignores stale initial results after newer auth events.
- Provides a recoverable loading timeout.
- Exposes retry and sign-out operations.

Supabase owns token refreshing and auth event propagation.

Sign-out uses local scope and affects the current device.

Browser session state controls presentation. It is not proof of
authorization for privileged backend operations.

Test real session expiry, multi-tab changes, refresh and sign-out
against the configured Supabase project.

## Security

Every VITE-prefixed value is public in the browser bundle.

Never place these in frontend code or frontend environment files:

- Supabase service-role keys
- Supabase sb_secret_ keys
- Database passwords
- AI provider secret keys
- Private API keys

Sensitive operations belong in Supabase Edge Functions or secure
backend endpoints.

Before introducing application data:

1. Enable RLS on every exposed table.
2. Write explicit ownership and role policies.
3. Test access as different users and as an unauthenticated client.
4. Configure Storage policies separately.
5. Validate identity, permissions and input server-side.
6. Add rate limits for sensitive endpoints.
7. Keep secrets in backend secret management.
8. Configure exact OAuth redirect allowlists.
9. Do not trust user-editable metadata for authorization.

Route guards and development flags do not replace RLS.

Do not log tokens or personal data.
Do not render untrusted HTML.

No application RLS migrations are included because this phase
does not create application tables.

Review HTTPS, CSP and other response headers for the chosen host
before deployment.

## UI and accessibility

The foundation provides:

- Semantic header, navigation and main regions
- A skip link
- Route focus management
- Route announcements
- Visible keyboard focus
- Minimum 44px interactive targets
- Labelled input and textarea primitives
- Associated hint and error text
- Button loading and disabled states
- Empty, error and skeleton states
- Success, information, warning and error notifications

Notifications are manually dismissible. At most three are shown.

The CSS and MotionConfig respect reduced-motion preferences.

## Theme foundation

CSS follows the operating system color preference by default.

Future theme controls may set:

    document.documentElement.dataset.theme = 'light'

or:

    document.documentElement.dataset.theme = 'dark'

Remove that attribute to return to the system preference.

Academic atmosphere is represented by a future catalogue identifier.
There is no hard-coded PCM, PCB or Humanities theme engine yet.

## Responsive layout

The layout supports widths from 320px.

Containers support:

- compact
- default
- wide
- full

Breakpoint conventions:

- 48rem: tablet
- 64rem: desktop
- 90rem: large desktop

The shell uses dynamic viewport height and safe-area insets.

Future wide tables and visualizations must manage overflow within
their own feature region, not by creating page-wide scrolling.

## Performance

System pages use lazy imports.

No Three.js, React Three Fiber, chart library or KaTeX dependency
is loaded in Phase 1.

Future heavy modules must remain isolated behind lazy routes or
dynamic imports.

Do not add duplicate animation, icon or state-management libraries.

## Quality gate

The complete application must be verified locally or in CI.

The full dependency installation, TypeScript checking, ESLint,
Vitest execution, Vite production build and live authentication
were not verified in the generation environment.

Before declaring Phase 1 complete:

- npm run check passes.
- npm run dev starts without unexpected console errors.
- Direct navigation and refresh work.
- Unknown paths show the 404.
- Protected routes redirect without loops.
- Session restoration does not flash protected content.
- Expired sessions and network failures recover correctly.
- Lazy imports show the skeleton.
- Failed route chunks provide a recovery action.
- Missing configuration shows development-only details.
- Production errors do not expose technical details.
- No secret credentials are present.
- Keyboard navigation and screen-reader announcements work.
- Reduced motion and dark mode are checked.
- Widths 320, 360, 390, 768, 1024 and 1440 are checked.
- No normal shell content creates horizontal scrolling.
- Dependency versions and the lockfile are reviewed.

## Deployment

The browser-history router requires host configuration that
rewrites non-asset application routes to /index.html.

Do not rewrite missing JavaScript assets to HTML.

Add host-specific rewrite rules before deployment.

Android packaging is deferred. Reassess routing and session storage
for the chosen Android wrapper when that phase begins.

## Roadmap

Phase 1 — Engineering foundation.

Phase 2 — Premium design system and adaptive academic visual language.

Phase 3 — Splash, welcome and authentication UI.

Phase 4 — Profile-backed onboarding.

Phase 5 — Versioned curriculum engine.

Phase 2 must extend this architecture rather than replace it.
