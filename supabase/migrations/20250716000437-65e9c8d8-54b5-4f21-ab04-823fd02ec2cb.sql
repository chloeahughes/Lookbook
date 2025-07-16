-- Add name field to profiles table to match students
ALTER TABLE public.profiles 
ADD COLUMN name TEXT;

-- Update the handle_new_user function to also capture name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER set search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, name)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name'
  );
  RETURN new;
END;
$$;