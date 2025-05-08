-- Create course evaluations tables
-- This script creates the necessary tables for anonymous course evaluations

-- Check if the course_evaluations table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_evaluations') THEN
        -- Create the course evaluations table
        CREATE TABLE public.course_evaluations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
            semester VARCHAR(20) NOT NULL,
            teaching_quality INTEGER NOT NULL CHECK (teaching_quality BETWEEN 1 AND 5),
            course_content INTEGER NOT NULL CHECK (course_content BETWEEN 1 AND 5),
            course_materials INTEGER NOT NULL CHECK (course_materials BETWEEN 1 AND 5),
            workload INTEGER NOT NULL CHECK (workload BETWEEN 1 AND 5),
            organization INTEGER NOT NULL CHECK (organization BETWEEN 1 AND 5),
            overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
            strengths TEXT,
            improvements TEXT,
            additional_comments TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT valid_semester CHECK (semester ~ '^(Spring|Summer|Fall|Winter) [0-9]{4}$')
        );

        -- Add comment to explain the anonymity
        COMMENT ON TABLE public.course_evaluations IS 'Stores anonymous course evaluations. No student identifiers are stored with evaluations.';
    END IF;

    -- Create a table to track which students have submitted evaluations without linking to specific evaluations
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'evaluation_submissions') THEN
        CREATE TABLE public.evaluation_submissions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
            semester VARCHAR(20) NOT NULL,
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, course_id, semester)
        );

        -- Add comment to explain the purpose
        COMMENT ON TABLE public.evaluation_submissions IS 'Tracks which students have submitted evaluations for which courses, without linking to specific evaluation content.';
    END IF;

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_course_evaluations_course_id ON public.course_evaluations(course_id);
    CREATE INDEX IF NOT EXISTS idx_course_evaluations_semester ON public.course_evaluations(semester);
    CREATE INDEX IF NOT EXISTS idx_evaluation_submissions_user_id ON public.evaluation_submissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_evaluation_submissions_course_id ON public.evaluation_submissions(course_id);

    -- Enable RLS on the tables
    ALTER TABLE public.course_evaluations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.evaluation_submissions ENABLE ROW LEVEL SECURITY;
END$$;

-- Create policies for course_evaluations
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Admins can see all evaluations" ON public.course_evaluations;
    DROP POLICY IF EXISTS "Faculty can see evaluations for their courses" ON public.course_evaluations;
    
    -- Create new policies
    CREATE POLICY "Admins can see all evaluations" 
    ON public.course_evaluations FOR SELECT 
    TO authenticated 
    USING (auth.jwt() ->> 'role' = 'admin');

    CREATE POLICY "Faculty can see evaluations for their courses" 
    ON public.course_evaluations FOR SELECT 
    TO authenticated 
    USING (
        auth.jwt() ->> 'role' = 'faculty' AND 
        EXISTS (
            SELECT 1 FROM public.teaching_assignments 
            WHERE teaching_assignments.course_id = course_evaluations.course_id 
            AND teaching_assignments.user_id = auth.uid()
        )
    );
END;
$$;

-- Create policies for evaluation_submissions
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can see their own submissions" ON public.evaluation_submissions;
    DROP POLICY IF EXISTS "Users can create their own submissions" ON public.evaluation_submissions;
    DROP POLICY IF EXISTS "Admins can see all submission records" ON public.evaluation_submissions;
    
    -- Create new policies
    CREATE POLICY "Users can see their own submissions" 
    ON public.evaluation_submissions FOR SELECT 
    TO authenticated 
    USING (user_id = auth.uid());

    CREATE POLICY "Users can create their own submissions" 
    ON public.evaluation_submissions FOR INSERT 
    TO authenticated 
    WITH CHECK (user_id = auth.uid());

    CREATE POLICY "Admins can see all submission records" 
    ON public.evaluation_submissions FOR SELECT 
    TO authenticated 
    USING (auth.jwt() ->> 'role' = 'admin');
END;
$$;

-- Create a function to get the current semester
DO $$
BEGIN
    CREATE OR REPLACE FUNCTION get_current_semester()
    RETURNS VARCHAR AS $$
    DECLARE
        current_month INTEGER;
        current_year INTEGER;
        semester VARCHAR;
    BEGIN
        current_month := EXTRACT(MONTH FROM CURRENT_DATE);
        current_year := EXTRACT(YEAR FROM CURRENT_DATE);
        
        IF current_month BETWEEN 1 AND 4 THEN
            semester := 'Spring ' || current_year;
        ELSIF current_month BETWEEN 5 AND 8 THEN
            semester := 'Summer ' || current_year;
        ELSE
            semester := 'Fall ' || current_year;
        END IF;
        
        RETURN semester;
    END;
    $$ LANGUAGE plpgsql;
END$$;
