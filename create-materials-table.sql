-- Create materials table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT materials_title_not_empty CHECK (length(title) > 0),
    CONSTRAINT materials_file_path_not_empty CHECK (length(file_path) > 0),
    CONSTRAINT materials_file_url_not_empty CHECK (length(file_url) > 0),
    CONSTRAINT materials_file_name_not_empty CHECK (length(file_name) > 0)
);

-- Add RLS policies for materials
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view materials for courses they're enrolled in or teaching
CREATE POLICY IF NOT EXISTS "Users can view materials for their courses" 
    ON public.materials FOR SELECT 
    USING (
        course_id IN (
            -- Courses the user is enrolled in (for students)
            SELECT course_id FROM public.enrollments WHERE user_id = auth.uid()
            UNION
            -- Courses the user teaches (for faculty)
            SELECT course_id FROM public.teaching_assignments WHERE user_id = auth.uid()
        ) OR
        -- Admin can view all
        EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Policy: Faculty can create materials for courses they teach
CREATE POLICY IF NOT EXISTS "Faculty can create materials for courses they teach" 
    ON public.materials FOR INSERT 
    WITH CHECK (
        (
            -- Faculty can upload to courses they teach
            course_id IN (
                SELECT course_id FROM public.teaching_assignments WHERE user_id = auth.uid()
            ) AND
            EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'faculty')
        ) OR
        -- Admin can upload to any course
        EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Policy: Faculty can update materials they uploaded
CREATE POLICY IF NOT EXISTS "Faculty can update materials they uploaded" 
    ON public.materials FOR UPDATE 
    USING (
        uploaded_by = auth.uid() AND
        (
            EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'faculty') OR
            EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'admin')
        )
    );

-- Policy: Faculty can delete materials they uploaded
CREATE POLICY IF NOT EXISTS "Faculty can delete materials they uploaded" 
    ON public.materials FOR DELETE 
    USING (
        uploaded_by = auth.uid() AND
        (
            EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'faculty') OR
            EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'admin')
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_materials_course_id ON public.materials(course_id);
CREATE INDEX IF NOT EXISTS idx_materials_uploaded_by ON public.materials(uploaded_by);

-- Create the study_materials table if it doesn't exist
CREATE TABLE IF NOT EXISTS study_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS study_materials_course_id_idx ON study_materials(course_id);
CREATE INDEX IF NOT EXISTS study_materials_uploaded_by_idx ON study_materials(uploaded_by);

-- Add RLS policies
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;

-- Policy for admins (full access)
CREATE POLICY admin_study_materials_policy ON study_materials
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Policy for faculty (can view all, but only modify their own)
CREATE POLICY faculty_view_study_materials_policy ON study_materials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'faculty'
    )
  );

CREATE POLICY faculty_modify_study_materials_policy ON study_materials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'faculty'
      AND uploaded_by = auth.uid()
    )
  );

-- Policy for students (can only view materials for courses they're enrolled in)
CREATE POLICY student_view_study_materials_policy ON study_materials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN enrollments e ON e.user_id = u.id
      WHERE u.id = auth.uid() 
      AND u.role = 'student'
      AND e.course_id = study_materials.course_id
    )
  );
