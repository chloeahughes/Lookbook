-- Update user_student_knowledge table to support three states: knows, doesn't know, and "know of"
-- Change knows_student from boolean to a text field with three possible values

-- First, add a new column with the three-state enum
CREATE TYPE knowledge_status AS ENUM ('knows', 'knows_of', 'does_not_know');

-- Add new column
ALTER TABLE public.user_student_knowledge 
ADD COLUMN knowledge_status knowledge_status;

-- Migrate existing data
UPDATE public.user_student_knowledge 
SET knowledge_status = CASE 
  WHEN knows_student = true THEN 'knows'::knowledge_status
  WHEN knows_student = false THEN 'does_not_know'::knowledge_status
  ELSE 'knows_of'::knowledge_status
END;

-- Make the new column NOT NULL now that we've populated it
ALTER TABLE public.user_student_knowledge 
ALTER COLUMN knowledge_status SET NOT NULL;

-- Drop the old boolean column
ALTER TABLE public.user_student_knowledge 
DROP COLUMN knows_student;