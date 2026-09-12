-- Averiq free-model AI router.
-- Provider credentials are stored separately in Supabase Vault and are never committed.

create table if not exists public.ai_model_pool (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model_id text not null,
  endpoint_url text not null,
  secret_name text not null,
  priority integer not null default 100 check (priority >= 0),
  enabled boolean not null default true,
  billing_allowed boolean not null default false check (billing_allowed = false),
  failure_count integer not null default 0 check (failure_count >= 0),
  cooldown_until timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, model_id)
);

alter table public.ai_model_pool enable row level security;
revoke all on table public.ai_model_pool from public, anon, authenticated;
grant select, insert, update, delete on table public.ai_model_pool to service_role;

create index if not exists idx_ai_model_pool_routing
  on public.ai_model_pool (enabled, billing_allowed, priority, cooldown_until);

create table if not exists public.ai_model_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  model_pool_id uuid references public.ai_model_pool(id) on delete set null,
  provider text not null,
  model_id text not null,
  status text not null check (status in ('success','retryable_error','fatal_error','timeout')),
  http_status integer,
  latency_ms integer not null default 0 check (latency_ms >= 0),
  error_code text,
  created_at timestamptz not null default now()
);

alter table public.ai_model_attempts enable row level security;
revoke all on table public.ai_model_attempts from public, anon, authenticated;
grant select, insert on table public.ai_model_attempts to service_role;
grant usage, select on sequence public.ai_model_attempts_id_seq to service_role;

create index if not exists idx_ai_model_attempts_model_created
  on public.ai_model_attempts (model_pool_id, created_at desc);
create index if not exists idx_ai_model_attempts_user_created
  on public.ai_model_attempts (user_id, created_at desc);

alter table public.ai_usage_events
  add column if not exists provider text,
  add column if not exists model_id text,
  add column if not exists attempts integer,
  add column if not exists latency_ms integer,
  add column if not exists fallback_chain jsonb not null default '[]'::jsonb;

create or replace function public.get_ai_provider_secret_v1(p_name text)
returns text
language sql
security definer
set search_path = ''
as $$
  select ds.decrypted_secret
  from vault.decrypted_secrets as ds
  where ds.name = p_name
  limit 1
$$;

revoke all on function public.get_ai_provider_secret_v1(text) from public, anon, authenticated;
grant execute on function public.get_ai_provider_secret_v1(text) to service_role;

insert into public.ai_model_pool (
  provider, model_id, endpoint_url, secret_name, priority, enabled, billing_allowed, metadata
)
values
  ('unorouter', 'ling-3.0-flash-fin:free', 'https://api.unorouter.com/v1/chat/completions', 'averiq_unorouter_api_key', 10, true, false, '{"tier":"free"}'::jsonb),
  ('unorouter', 'glm-5.3-flash:free', 'https://api.unorouter.com/v1/chat/completions', 'averiq_unorouter_api_key', 20, true, false, '{"tier":"free"}'::jsonb),
  ('unorouter', 'gemini-3.5-flash-lite:free', 'https://api.unorouter.com/v1/chat/completions', 'averiq_unorouter_api_key', 30, true, false, '{"tier":"free"}'::jsonb),
  ('unorouter', 'nemotron-3-ultra-550b-a55b:free', 'https://api.unorouter.com/v1/chat/completions', 'averiq_unorouter_api_key', 40, true, false, '{"tier":"free"}'::jsonb),
  ('unorouter', 'gemma-4-26b:free', 'https://api.unorouter.com/v1/chat/completions', 'averiq_unorouter_api_key', 50, true, false, '{"tier":"free"}'::jsonb),
  ('unorouter', 'muse-glimmer-30b:free', 'https://api.unorouter.com/v1/chat/completions', 'averiq_unorouter_api_key', 60, true, false, '{"tier":"free"}'::jsonb),
  ('unorouter', 'mistral-large-3-675b:free', 'https://api.unorouter.com/v1/chat/completions', 'averiq_unorouter_api_key', 70, true, false, '{"tier":"free"}'::jsonb)
on conflict (provider, model_id) do update
set endpoint_url = excluded.endpoint_url,
    secret_name = excluded.secret_name,
    priority = excluded.priority,
    enabled = excluded.enabled,
    billing_allowed = false,
    metadata = excluded.metadata,
    updated_at = now();