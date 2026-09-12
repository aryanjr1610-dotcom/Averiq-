begin;

-- Expand factual claim extraction from Class 12 to every 2026-27 lesson version in Classes 6-11.
-- This migration never auto-passes factual accuracy. Claims remain pending until supported by evidence.

with scope as (
  select lv.id version_id, cr.grade_level, eb.code board_code, cs.title subject_title
  from public.lesson_versions lv
  join public.lessons l on l.id=lv.lesson_id
  join public.topics t on t.id=l.topic_id
  join public.chapters ch on ch.id=t.chapter_id
  join public.curriculum_subjects cs on cs.id=ch.curriculum_subject_id
  join public.curriculum_releases cr on cr.id=cs.release_id
  join public.curriculum_tracks ct on ct.id=cr.track_id
  join public.education_boards eb on eb.id=ct.board_id
  where cr.academic_year_id=(select id from public.academic_years where code='2026-27' limit 1)
    and cr.grade_level between 6 and 11
)
insert into averiq_private.lesson_fact_claims(
  version_id,claim_key,claim_type,source_table,source_row_id,claim_text,normalized_claim,criticality,status,metadata
)
select k.version_id,
       'term:'||k.id::text,
       'definition','lesson_key_terms',k.id,
       k.term||': '||k.definition,
       lower(regexp_replace(btrim(k.term||': '||k.definition),'\s+',' ','g')),
       'major','pending',
       jsonb_build_object('grade',s.grade_level,'board',s.board_code,'subject',s.subject_title,'term',k.term)
from public.lesson_key_terms k
join scope s on s.version_id=k.version_id
where btrim(k.term)<>'' and btrim(k.definition)<>''
on conflict (version_id,claim_key) do nothing;

with scope as (
  select lv.id version_id, cr.grade_level, eb.code board_code, cs.title subject_title
  from public.lesson_versions lv
  join public.lessons l on l.id=lv.lesson_id
  join public.topics t on t.id=l.topic_id
  join public.chapters ch on ch.id=t.chapter_id
  join public.curriculum_subjects cs on cs.id=ch.curriculum_subject_id
  join public.curriculum_releases cr on cr.id=cs.release_id
  join public.curriculum_tracks ct on ct.id=cr.track_id
  join public.education_boards eb on eb.id=ct.board_id
  where cr.academic_year_id=(select id from public.academic_years where code='2026-27' limit 1)
    and cr.grade_level between 6 and 11
)
insert into averiq_private.lesson_fact_claims(
  version_id,claim_key,claim_type,source_table,source_row_id,claim_text,normalized_claim,criticality,status,metadata
)
select f.version_id,
       'formula:'||f.id::text,
       'formula','lesson_formulas',f.id,
       concat_ws(E'\n',f.name,f.statement,'Formula: '||coalesce(f.expression_latex,''),'Derivation/reasoning: '||coalesce(f.derivation,''),'Conditions: '||coalesce(f.conditions,'')),
       lower(regexp_replace(btrim(concat_ws(' ',f.name,f.statement,coalesce(f.expression_latex,''),coalesce(f.derivation,''),coalesce(f.conditions,''))),'\s+',' ','g')),
       'critical','pending',
       jsonb_build_object('grade',s.grade_level,'board',s.board_code,'subject',s.subject_title,'formula_name',f.name)
from public.lesson_formulas f
join scope s on s.version_id=f.version_id
where btrim(f.name)<>'' and btrim(f.statement)<>''
on conflict (version_id,claim_key) do nothing;

with scope as (
  select lv.id version_id, cr.grade_level, eb.code board_code, cs.title subject_title
  from public.lesson_versions lv
  join public.lessons l on l.id=lv.lesson_id
  join public.topics t on t.id=l.topic_id
  join public.chapters ch on ch.id=t.chapter_id
  join public.curriculum_subjects cs on cs.id=ch.curriculum_subject_id
  join public.curriculum_releases cr on cr.id=cs.release_id
  join public.curriculum_tracks ct on ct.id=cr.track_id
  join public.education_boards eb on eb.id=ct.board_id
  where cr.academic_year_id=(select id from public.academic_years where code='2026-27' limit 1)
    and cr.grade_level between 6 and 11
)
insert into averiq_private.lesson_fact_claims(
  version_id,claim_key,claim_type,source_table,source_row_id,claim_text,normalized_claim,criticality,status,metadata
)
select e.version_id,
       'example:'||e.id::text,
       'example','lesson_examples',e.id,
       concat_ws(E'\n','Problem: '||e.problem_statement,'Solution: '||e.solution,'Final answer: '||coalesce(e.final_answer,'')),
       lower(regexp_replace(btrim(concat_ws(' ',e.problem_statement,e.solution,coalesce(e.final_answer,''))),'\s+',' ','g')),
       'major','pending',
       jsonb_build_object('grade',s.grade_level,'board',s.board_code,'subject',s.subject_title,'difficulty',e.difficulty)
from public.lesson_examples e
join scope s on s.version_id=e.version_id
where btrim(e.problem_statement)<>'' and btrim(e.solution)<>''
on conflict (version_id,claim_key) do nothing;

with scope as (
  select lv.id version_id, cr.grade_level, eb.code board_code, cs.title subject_title
  from public.lesson_versions lv
  join public.lessons l on l.id=lv.lesson_id
  join public.topics t on t.id=l.topic_id
  join public.chapters ch on ch.id=t.chapter_id
  join public.curriculum_subjects cs on cs.id=ch.curriculum_subject_id
  join public.curriculum_releases cr on cr.id=cs.release_id
  join public.curriculum_tracks ct on ct.id=cr.track_id
  join public.education_boards eb on eb.id=ct.board_id
  where cr.academic_year_id=(select id from public.academic_years where code='2026-27' limit 1)
    and cr.grade_level between 6 and 11
)
insert into averiq_private.lesson_fact_claims(
  version_id,claim_key,claim_type,source_table,source_row_id,claim_text,normalized_claim,criticality,status,metadata
)
select e.version_id,
       'exercise:'||e.id::text,
       'exercise_answer','lesson_exercises',e.id,
       concat_ws(E'\n','Question: '||e.question_text,'Expected answer: '||coalesce(e.answer::text,''),'Solution: '||coalesce(e.solution,'')),
       lower(regexp_replace(btrim(concat_ws(' ',e.question_text,coalesce(e.answer::text,''),coalesce(e.solution,''))),'\s+',' ','g')),
       case when e.question_type in ('numerical','proof','derivation') then 'critical' else 'major' end,
       'pending',
       jsonb_build_object('grade',s.grade_level,'board',s.board_code,'subject',s.subject_title,'question_type',e.question_type,'difficulty',e.difficulty)
from public.lesson_exercises e
join scope s on s.version_id=e.version_id
where btrim(e.question_text)<>'' and (e.answer is not null or btrim(coalesce(e.solution,''))<>'')
on conflict (version_id,claim_key) do nothing;

with scope as (
  select lv.id version_id, cr.grade_level, eb.code board_code, cs.title subject_title
  from public.lesson_versions lv
  join public.lessons l on l.id=lv.lesson_id
  join public.topics t on t.id=l.topic_id
  join public.chapters ch on ch.id=t.chapter_id
  join public.curriculum_subjects cs on cs.id=ch.curriculum_subject_id
  join public.curriculum_releases cr on cr.id=cs.release_id
  join public.curriculum_tracks ct on ct.id=cr.track_id
  join public.education_boards eb on eb.id=ct.board_id
  where cr.academic_year_id=(select id from public.academic_years where code='2026-27' limit 1)
    and cr.grade_level between 6 and 11
), split_blocks as (
  select b.id block_id,b.version_id,b.block_type,b.heading,s.grade_level,s.board_code,s.subject_title,
         btrim(x.sentence) claim_text
  from public.lesson_content_blocks b
  join scope s on s.version_id=b.version_id
  cross join lateral regexp_split_to_table(
    regexp_replace(coalesce(b.body,''), E'([.!?])\\s+', E'\\1\n', 'g'),
    E'[\n\r]+'
  ) as x(sentence)
  where b.block_type not in ('practice','worked_example','learning_objectives','prerequisites')
)
insert into averiq_private.lesson_fact_claims(
  version_id,claim_key,claim_type,source_table,source_row_id,claim_text,normalized_claim,criticality,status,metadata
)
select sb.version_id,
       'block:'||sb.block_id::text||':'||md5(sb.claim_text),
       'content','lesson_content_blocks',sb.block_id,
       sb.claim_text,
       lower(regexp_replace(sb.claim_text,'\s+',' ','g')),
       case when sb.block_type in ('law','theorem','formula') then 'critical' else 'major' end,
       'pending',
       jsonb_build_object('grade',sb.grade_level,'board',sb.board_code,'subject',sb.subject_title,'heading',sb.heading,'block_type',sb.block_type)
from split_blocks sb
where char_length(sb.claim_text)>=12
on conflict (version_id,claim_key) do nothing;

commit;
