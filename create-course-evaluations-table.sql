-- Create course evaluations table
CREATE TABLE IF NOT EXISTS public.course_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  semester VARCHAR(20) NOT NULL,
  teaching_rating INTEGER NOT NULL CHECK (teaching_rating BETWEEN 1 AND 5),
  content_rating INTEGER NOT NULL CHECK (content_rating BETWEEN 1 AND 5),
  difficulty_rating INTEGER NOT NULL CHECK (difficulty_rating BETWEEN 1 AND 5),
  workload_rating INTEGER NOT NULL CHECK (workload_rating BETWEEN 1 AND 5),
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  strengths TEXT,
  improvements TEXT,
  additional_comments TEXT,
  submission_hash VARCHAR(64) NOT NULL, -- Stores hash of student_id + course_id to prevent duplicates without identifying student
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster course-based queries
CREATE INDEX IF NOT EXISTS course_evaluations_course_id_idx ON public.course_evaluations(course_id);

-- Create index for semester-based queries
CREATE INDEX IF NOT EXISTS course_evaluations_semester_idx ON public.course_evaluations(semester);

-- Add comment to explain the table
COMMENT ON TABLE public.course_evaluations IS 'Stores anonymous course evaluations submitted by students';

-- Set up Row Level Security
ALTER TABLE public.course_evaluations ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all evaluations
CREATE POLICY admin_view_evaluations ON public.course_evaluations
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Policy for faculty to view evaluations for their courses
CREATE POLICY faculty_view_evaluations ON public.course_evaluations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teaching_assignments ta
      JOIN users u ON u.id = ta.user_id
      WHERE u.id = auth.uid() 
      AND u.role = 'faculty' 
      AND ta.course_id = course_evaluations.course_id
    )
  );

-- Policy for students to insert evaluations
CREATE POLICY student_insert_evaluations ON public.course_evaluations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN enrollments e ON e.user_id = u.id
      WHERE u.id = auth.uid() 
      AND u.role = 'student' 
      AND e.course_id = course_evaluations.course_id
    )
  );

-- Function to generate a submission hash (prevents duplicate submissions without identifying students)
CREATE OR REPLACE FUNCTION generate_evaluation_hash(student_id UUID, course_id UUID, semester VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  RETURN encode(digest(student_id::text || course_id::text || semester, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a student has already submitted an evaluation
CREATE OR REPLACE FUNCTION has_submitted_evaluation(student_id UUID, course_id UUID, semester VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  hash VARCHAR;
BEGIN
  hash := generate_evaluation_hash(student_id, course_id, semester);
  RETURN EXISTS (
    SELECT 1 FROM course_evaluations 
    WHERE course_id = $2 
    AND submission_hash = hash
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
