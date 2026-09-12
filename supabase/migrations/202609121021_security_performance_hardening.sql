-- Production security/performance hardening.

-- Cover foreign keys used by joins, deletes/cascades and common ownership queries.
create index if not exists idx_academic_imports_release_id on public.academic_imports(release_id);
create index if not exists idx_ai_conversations_user_id on public.ai_conversations(user_id);
create index if not exists idx_ai_messages_conversation_id on public.ai_messages(conversation_id);
create index if not exists idx_ai_messages_user_id on public.ai_messages(user_id);
create index if not exists idx_ai_usage_events_user_id on public.ai_usage_events(user_id);
create index if not exists idx_chapters_course_curriculum_subject on public.chapters(course_id, curriculum_subject_id);
create index if not exists idx_competitive_exam_subjects_subject_id on public.competitive_exam_subjects(subject_id);
create index if not exists idx_competitive_exam_topics_exam_id on public.competitive_exam_topics(exam_id);
create index if not exists idx_competitive_exam_topics_topic_id on public.competitive_exam_topics(topic_id);
create index if not exists idx_competitive_pyq_questions_exam_id on public.competitive_pyq_questions(exam_id);
create index if not exists idx_competitive_pyq_questions_topic_id on public.competitive_pyq_questions(topic_id);
create index if not exists idx_competitive_test_submissions_exam_id on public.competitive_test_submissions(exam_id);
create index if not exists idx_competitive_test_submissions_user_id on public.competitive_test_submissions(user_id);
create index if not exists idx_curriculum_releases_track_id on public.curriculum_releases(track_id);
create index if not exists idx_curriculum_subjects_subject_id on public.curriculum_subjects(subject_id);
create index if not exists idx_curriculum_tracks_board_id on public.curriculum_tracks(board_id);
create index if not exists idx_legacy_path_mappings_combination_id on public.legacy_path_mappings(combination_id);
create index if not exists idx_legacy_path_mappings_track_id on public.legacy_path_mappings(track_id);
create index if not exists idx_legacy_subject_mappings_subject_id on public.legacy_subject_mappings(subject_id);
create index if not exists idx_note_tags_tag_id on public.note_tags(tag_id);
create index if not exists idx_note_tags_user_id on public.note_tags(user_id);
create index if not exists idx_profile_change_log_user_id on public.profile_change_log(user_id);
create index if not exists idx_profiles_catalog_version on public.profiles(catalog_version);
create index if not exists idx_subject_combinations_stream_id on public.subject_combinations(stream_id);

-- Avoid re-evaluating auth.uid() once per row in RLS policies.
drop policy if exists student_subjects_own on public.student_subjects;
create policy student_subjects_own on public.student_subjects
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists student_competitive_goals_own on public.student_competitive_goals;
create policy student_competitive_goals_own on public.student_competitive_goals
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists user_tags_own on public.user_tags;
create policy user_tags_own on public.user_tags
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists note_tags_own on public.note_tags;
create policy note_tags_own on public.note_tags
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists ai_conversations_own on public.ai_conversations;
create policy ai_conversations_own on public.ai_conversations
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists ai_messages_own on public.ai_messages;
create policy ai_messages_own on public.ai_messages
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists competitive_test_submissions_own on public.competitive_test_submissions;
create policy competitive_test_submissions_own on public.competitive_test_submissions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Remove redundant owner SELECT policies now covered by the optimized ALL policies.
drop policy if exists "Students read their own subjects" on public.student_subjects;
drop policy if exists "Students read their own competitive goals" on public.student_competitive_goals;

-- Keep the strict academic policy chain and remove older weaker duplicate published policies.
drop policy if exists chapters_read_published on public.chapters;
drop policy if exists curriculum_read_published on public.curriculum_releases;
drop policy if exists curriculum_subjects_read on public.curriculum_subjects;
drop policy if exists lesson_versions_read on public.lesson_versions;
drop policy if exists lessons_read_published on public.lessons;
drop policy if exists topics_read_published on public.topics;
drop policy if exists catalogs_read_active on public.averiq_onboarding_catalogs;

drop policy if exists subjects_read_active on public.subjects;
drop policy if exists academic_read on public.subjects;
create policy academic_read on public.subjects
for select to authenticated
using (status = 'active' or (select public.academic_is_reviewer()));

-- No anonymous direct access is needed for signed-in student curriculum flows.
revoke all on table public.averiq_onboarding_catalogs from anon;
revoke all on table public.chapters from anon;
revoke all on table public.curriculum_releases from anon;
revoke all on table public.curriculum_subjects from anon;
revoke all on table public.lesson_versions from anon;
revoke all on table public.lessons from anon;
revoke all on table public.subjects from anon;
revoke all on table public.topics from anon;

-- Operational/internal tables stay server-only even though RLS is also enabled.
revoke all on table public.ai_model_pool from anon, authenticated;
revoke all on table public.ai_model_attempts from anon, authenticated;
revoke all on table public.ai_usage_events from anon, authenticated;
revoke all on table public.content_ingestion_runs from anon, authenticated;
revoke all on table public.lesson_validation_checks from anon, authenticated;
revoke all on table public.profile_change_log from anon, authenticated;
