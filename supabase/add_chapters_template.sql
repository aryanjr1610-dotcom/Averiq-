-- ==============================================================================
-- CHAPTER & LESSON INGESTION TEMPLATE
-- Use this template to attach chapters, topics, and lessons to any subject.
-- You can tell me the chapter names and lessons in chat, and I will generate
-- this SQL for you, or you can paste directly here.
-- ==============================================================================

-- Subject ID Reference from master_backend_setup.sql:
-- Physics:     'cs111111-1111-1111-1111-111111111111'
-- Chemistry:   'cs222222-2222-2222-2222-222222222222'
-- Mathematics: 'cs333333-3333-3333-3333-333333333333'
-- Biology:     'cs444444-4444-4444-4444-444444444444'

-- -----------------------------------------------------------------------------
-- EXAMPLE: Adding a Chapter to Physics
-- -----------------------------------------------------------------------------
/*
-- 1. Create the Chapter
insert into public.chapters (
  id, curriculum_subject_id, title, slug, chapter_number, position, description, status
) values (
  gen_random_uuid(),
  'cs111111-1111-1111-1111-111111111111', -- Physics
  'Units and Measurements',               -- Chapter Title
  'units-and-measurements',               -- URL slug
  'Chapter 1',                            -- Chapter number
  0,                                      -- Position order
  'Introduction to physical quantities, SI units, dimensional analysis and error measurement.',
  'published'
);

-- 2. Create Topics under the Chapter
-- 3. Create Lessons under the Topics
*/
