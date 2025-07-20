-- Update the handle_new_user function to populate profile with student data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  student_record RECORD;
BEGIN
  -- If the user has student_id in metadata, get student info
  IF new.raw_user_meta_data ->> 'student_id' IS NOT NULL THEN
    SELECT * INTO student_record 
    FROM public.Students 
    WHERE id = (new.raw_user_meta_data ->> 'student_id')::bigint;
    
    -- Insert profile with student data
    INSERT INTO public.profiles (user_id, display_name, name, hometown, avatar_url)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data ->> 'name', student_record.name),
      COALESCE(new.raw_user_meta_data ->> 'name', student_record.name),
      student_record.hometown,
      student_record.image_url
    );
  ELSE
    -- Fallback for users without student selection
    INSERT INTO public.profiles (user_id, display_name, name)
    VALUES (
      new.id, 
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    );
  END IF;
  
  RETURN new;
END;
$function$;