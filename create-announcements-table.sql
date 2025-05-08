-- Create announcements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS announcements_course_id_idx ON public.announcements(course_id);
CREATE INDEX IF NOT EXISTS announcements_created_by_idx ON public.announcements(created_by);
CREATE INDEX IF NOT EXISTS announcements_created_at_idx ON public.announcements(created_at);

-- Add RLS policies
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policy for admins (full access)
CREATE POLICY admin_all_access ON public.announcements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Policy for faculty (can read all, create/update/delete their own)
CREATE POLICY faculty_read_all ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'faculty'
    )
  );

CREATE POLICY faculty_write_own ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'faculty'
    )
  );

-- Policy for students (can only read)
CREATE POLICY student_read_all ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'student'
    )
  );

-- Grant permissions
GRANT ALL ON public.announcements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
