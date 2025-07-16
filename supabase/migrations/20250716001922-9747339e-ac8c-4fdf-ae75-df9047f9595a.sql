-- Make sure the students bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('students', 'students', true)
ON CONFLICT (id) DO UPDATE SET 
  public = true;

-- Create policies for the students bucket to allow public access
CREATE POLICY "Public Access to Students Images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'students');