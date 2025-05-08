-- First ensure the extension for UUID generation is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the study_materials table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.study_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    course_id UUID NOT NULL,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Check for file_name column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'study_materials' 
        AND column_name = 'file_name'
    ) THEN
        ALTER TABLE public.study_materials ADD COLUMN file_name TEXT NOT NULL DEFAULT 'unnamed_file';
    END IF;
    
    -- Check for file_type column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'study_materials' 
        AND column_name = 'file_type'
    ) THEN
        ALTER TABLE public.study_materials ADD COLUMN file_type TEXT NOT NULL DEFAULT 'application/octet-stream';
    END IF;
    
    -- Check for file_size column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'study_materials' 
        AND column_name = 'file_size'
    ) THEN
        ALTER TABLE public.study_materials ADD COLUMN file_size INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    -- Check for uploaded_by column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'study_materials' 
        AND column_name = 'uploaded_by'
    ) THEN
        ALTER TABLE public.study_materials ADD COLUMN uploaded_by UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
        -- Add foreign key constraint
        ALTER TABLE public.study_materials 
        ADD CONSTRAINT study_materials_uploaded_by_fkey 
        FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
    -- Policy for students to view materials for courses they're enrolled in
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'study_materials' 
        AND policyname = 'student_view_study_materials_policy'
    ) THEN
        CREATE POLICY student_view_study_materials_policy ON study_materials
            FOR SELECT
            TO authenticated
            USING (EXISTS (
                SELECT 1 FROM users u 
                JOIN enrollments e ON e.user_id = u.id 
                WHERE u.id = auth.uid() 
                AND u.role = 'student' 
                AND e.course_id = study_materials.course_id
            ));
    END IF;
    
    -- Policy for faculty to view all materials
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'study_materials' 
        AND policyname = 'faculty_view_study_materials_policy'
    ) THEN
        CREATE POLICY faculty_view_study_materials_policy ON study_materials
            FOR SELECT
            TO authenticated
            USING (EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role IN ('faculty', 'admin')
            ));
    END IF;
    
    -- Policy for faculty to modify their own materials
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'study_materials' 
        AND policyname = 'faculty_modify_study_materials_policy'
    ) THEN
        CREATE POLICY faculty_modify_study_materials_policy ON study_materials
            FOR ALL
            TO authenticated
            USING (EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role = 'faculty' 
                AND study_materials.uploaded_by = auth.uid()
            ));
    END IF;
    
    -- Policy for admins to modify all materials
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'study_materials' 
        AND policyname = 'admin_modify_study_materials_policy'
    ) THEN
        CREATE POLICY admin_modify_study_materials_policy ON study_materials
            FOR ALL
            TO authenticated
            USING (EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role = 'admin'
            ));
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS study_materials_course_id_idx ON public.study_materials(course_id);
CREATE INDEX IF NOT EXISTS study_materials_uploaded_by_idx ON public.study_materials(uploaded_by);

-- Update the schema cache
COMMENT ON TABLE public.study_materials IS 'Table for storing course materials uploaded by faculty';
