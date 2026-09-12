-- Averiq Phase 13: AI tutor conversation storage. Owner-only, self-contained.
set local search_path = public;

do $guard$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'profiles table is required (migration 202609080001)';
  end if;
  if to_regclass('public.ai_conversations') is not null then
    raise exception 'ai_conversations already exists; review before re-running';
  end if;
end
$guard$;

create or replace function public.ai_touch_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_conversation_title_length check (char_length(title) between 1 and 160)
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  mode text,
  context jsonb,
  created_at timestamptz not null default now(),
  constraint ai_message_length check (char_length(content) between 1 and 20000)
);

create table public.ai_usage_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  input_chars integer not null default 0,
  output_chars integer not null default 0,
  grounded boolean not null default false,
  created_at timestamptz not null default now()
);

create index ai_conversations_recent on public.ai_conversations (user_id, updated_at desc);
create index ai_messages_thread on public.ai_messages (conversation_id, created_at);
create index ai_usage_window on public.ai_usage_events (user_id, created_at desc);

create trigger touch_ai_conversations before update on public.ai_conversations
  for each row execute function public.ai_touch_updated_at();

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.ai_conversations force row level security;
alter table public.ai_messages force row level security;
alter table public.ai_usage_events force row level security;

create policy ai_conversations_own on public.ai_conversations
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy ai_messages_own on public.ai_messages
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy ai_usage_read_own on public.ai_usage_events
  for select to authenticated using (user_id = auth.uid());

revoke all on public.ai_usage_events from anon, authenticated;
grant select on public.ai_usage_events to authenticated;
grant select, insert, update, delete on public.ai_conversations to authenticated;
grant select, insert, delete on public.ai_messages to authenticated;
grant all on public.ai_conversations, public.ai_messages, public.ai_usage_events to service_role;
grant usage, select on sequence public.ai_usage_events_id_seq to service_role;
