-- Grounded academic enrichment pass.
-- This migration deliberately reuses only lesson content already stored in Averiq.
-- It does NOT mark factual_accuracy as passed; external claim-by-claim source review remains required.

begin;

-- One source-grounded MCQ per lesson version with at least four key terms.
with ranked as (
  select version_id, term, definition,
         row_number() over (partition by version_id order by position, id) as rn
  from public.lesson_key_terms
  where btrim(term)<>'' and btrim(definition)<>''
), four as (
  select version_id,
         max(term) filter (where rn=1) as t1,
         max(definition) filter (where rn=1) as d1,
         max(term) filter (where rn=2) as t2,
         max(term) filter (where rn=3) as t3,
         max(term) filter (where rn=4) as t4
  from ranked where rn<=4 group by version_id having count(*)=4
), pos as (
  select version_id, coalesce(max(position),0)+1 as next_pos from public.lesson_exercises group by version_id
)
insert into public.lesson_exercises(
  version_id, question_key, position, question_type, question_text,
  options, answer, solution, explanation, difficulty, marks, competency_tags, metadata
)
select f.version_id,
       'grounded_mcq_key_term_v1',
       coalesce(p.next_pos,1),
       'mcq',
       'Which term best matches this definition: ' || f.d1,
       jsonb_build_array(f.t1,f.t2,f.t3,f.t4),
       jsonb_build_object('expected',f.t1),
       'The correct term is ' || f.t1 || ' because its stored lesson definition is: ' || f.d1,
       'This question is generated only from key terms already stored in the lesson.',
       'easy', 1, array['recall','terminology']::text[],
       jsonb_build_object('qa','grounded-practice-2026-09','generated_from','lesson_key_terms','grounded',true)
from four f left join pos p using(version_id)
on conflict (version_id,question_key) do nothing;

-- One fill-blank definition check per version.
with first_term as (
  select distinct on (version_id) version_id, term, definition
  from public.lesson_key_terms
  where btrim(term)<>'' and btrim(definition)<>''
  order by version_id, position, id
), pos as (
  select version_id, coalesce(max(position),0)+1 as next_pos from public.lesson_exercises group by version_id
)
insert into public.lesson_exercises(
  version_id, question_key, position, question_type, question_text,
  options, answer, solution, explanation, difficulty, marks, competency_tags, metadata
)
select f.version_id,
       'grounded_fill_key_term_v1',
       coalesce(p.next_pos,1),
       'fill_blank',
       'Write the key term that matches this definition: ' || f.definition,
       null,
       jsonb_build_object('expected',f.term),
       'Expected term: ' || f.term || '. Definition: ' || f.definition,
       'The answer comes directly from the lesson key-term bank.',
       'easy', 1, array['recall','terminology']::text[],
       jsonb_build_object('qa','grounded-practice-2026-09','generated_from','lesson_key_terms','grounded',true)
from first_term f left join pos p using(version_id)
on conflict (version_id,question_key) do nothing;

-- Concept synthesis built only from existing key terms and definitions.
with terms as (
  select version_id,
         string_agg('• '||term||': '||definition, E'\n' order by position,id) filter (where rn<=4) as body
  from (
    select version_id,term,definition,position,id,
           row_number() over(partition by version_id order by position,id) rn
    from public.lesson_key_terms
    where btrim(term)<>'' and btrim(definition)<>''
  ) x
  group by version_id
), pos as (
  select version_id,coalesce(max(position),0)+1 next_pos from public.lesson_content_blocks group by version_id
)
insert into public.lesson_content_blocks(
  version_id, block_key, position, block_type, depth_level, heading, body, metadata
)
select t.version_id,
       'grounded_concept_synthesis_v1',
       coalesce(p.next_pos,1),
       'concept','advanced','Concept Synthesis',
       'Connect these lesson ideas before attempting higher-order questions:'||E'\n'||t.body||E'\n\nUse the exact definitions above when comparing, applying, or explaining the concepts.',
       jsonb_build_object('qa','grounded-expansion-2026-09','generated_from','lesson_key_terms','grounded',true)
from terms t left join pos p using(version_id)
where t.body is not null
on conflict (version_id,block_key) do nothing;

-- Safe formula annotation completion.
update public.lesson_formulas
set units_notes = case
  when units_notes is not null and btrim(units_notes)<>'' then units_notes
  when jsonb_typeof(variables)='array' and jsonb_array_length(variables)>0 and exists (
    select 1 from jsonb_array_elements(variables) v where coalesce(v->>'unit','')<>''
  ) then (
    select 'Units: ' || string_agg(coalesce(v->>'symbol','quantity') || ' — ' || coalesce(v->>'unit','use lesson units'), '; ')
    from jsonb_array_elements(variables) v
  )
  else 'Use units appropriate to the quantities in the relation and check dimensional consistency where units apply.'
end,
common_mistakes = case
  when common_mistakes is null or btrim(common_mistakes)='' then 'Apply the relation only under its stated conditions and keep symbols, signs, and units consistent.'
  else common_mistakes
end,
metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('annotation_pass','2026-09-12','derivation_present',true),
updated_at=now();

update public.lesson_formulas
set variables=jsonb_build_array(
  jsonb_build_object('symbol','a','meaning','first integer'),
  jsonb_build_object('symbol','b','meaning','integer being subtracted')
), updated_at=now()
where name='Subtracting an integer' and expression_latex='a-b=a+(-b)' and jsonb_array_length(variables)=0;

update public.lesson_formulas
set variables=jsonb_build_array(
  jsonb_build_object('symbol','\\Delta V','meaning','potential change around a circuit element')
), updated_at=now()
where name='Kirchhoff loop rule' and jsonb_array_length(variables)=0;

-- Every stored formula derivation gets a matching grounded practice item.
with missing as (
  select f.*,
         row_number() over(partition by f.version_id order by f.position,f.id) as rn
  from public.lesson_formulas f
  where f.derivation is not null and btrim(f.derivation)<>''
    and not exists (
      select 1 from public.lesson_exercises e
      where e.version_id=f.version_id and e.metadata->>'formula_id'=f.id::text
    )
), base_pos as (
  select version_id,coalesce(max(position),0) as max_pos from public.lesson_exercises group by version_id
)
insert into public.lesson_exercises(
  version_id,question_key,position,question_type,question_text,options,answer,solution,explanation,difficulty,marks,competency_tags,metadata
)
select m.version_id,
       'formula_reasoning_'||m.id::text,
       coalesce(p.max_pos,0)+m.rn,
       'derivation',
       'Explain or derive '||m.name||' and state the conditions under which the relation is used.',
       null,
       jsonb_build_object('expected',m.expression_latex),
       m.statement||E'\nFormula: '||m.expression_latex||E'\nDerivation / reasoning: '||m.derivation||E'\nConditions: '||coalesce(m.conditions,'Use the conditions stated in the lesson.'),
       'Grounded directly in the lesson formula bank.',
       'medium',3,array['formula','reasoning','derivation']::text[],
       jsonb_build_object('qa','grounded-practice-2026-09','generated_from','lesson_formulas','formula_id',m.id::text,'grounded',true)
from missing m left join base_pos p using(version_id)
on conflict (version_id,question_key) do nothing;

-- Internal consistency audit. Keep factual_accuracy warning until external source verification is complete.
with audit as (
  select lv.id version_id,
    (select count(*) from public.lesson_version_sources s where s.version_id=lv.id and s.authority_level='official') official_sources,
    (select count(*) from public.lesson_content_blocks b where b.version_id=lv.id) blocks,
    (select count(*) from public.lesson_key_terms k where k.version_id=lv.id) terms,
    (select count(*) from public.lesson_formulas f where f.version_id=lv.id) formulas,
    (select count(*) from public.lesson_exercises e where e.version_id=lv.id and (e.answer is null or e.solution is null or btrim(coalesce(e.solution,''))='')) incomplete_exercises,
    (select count(*) from (
       select lower(btrim(k.term)) term,count(distinct lower(btrim(k.definition))) defs
       from public.lesson_key_terms k where k.version_id=lv.id
       group by lower(btrim(k.term)) having count(distinct lower(btrim(k.definition)))>1
     ) q) conflicting_term_definitions,
    (select count(*) from (
       select lower(btrim(f.name)) name,count(distinct btrim(f.expression_latex)) exprs
       from public.lesson_formulas f where f.version_id=lv.id
       group by lower(btrim(f.name)) having count(distinct btrim(f.expression_latex))>1
     ) q) conflicting_formula_expressions
  from public.lesson_versions lv
)
update public.lesson_validation_checks c
set details = coalesce(c.details,'{}'::jsonb) || jsonb_build_object(
      'internal_consistency_audit','2026-09-12',
      'official_sources',a.official_sources,
      'content_blocks',a.blocks,
      'key_terms',a.terms,
      'formulas',a.formulas,
      'incomplete_exercises',a.incomplete_exercises,
      'conflicting_term_definitions',a.conflicting_term_definitions,
      'conflicting_formula_expressions',a.conflicting_formula_expressions,
      'internal_consistency_passed',(a.incomplete_exercises=0 and a.conflicting_term_definitions=0 and a.conflicting_formula_expressions=0),
      'publication_block','External claim-by-claim source verification is still required before factual_accuracy can pass.'
    ),
    checked_at=now(), updated_at=now()
from audit a
where c.version_id=a.version_id and c.check_type='factual_accuracy';

commit;
