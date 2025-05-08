-- First, check if the announcements table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'announcements') THEN
        -- Table exists, check if created_by column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'announcements' 
                       AND column_name = 'created_by') THEN
            -- Add the created_by column
            ALTER TABLE public.announcements 
            ADD COLUMN created_by UUID REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
        
        -- Check if course_id column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'announcements' 
                       AND column_name = 'course_id') THEN
            -- Add the course_id column
            ALTER TABLE public.announcements 
            ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;
        END IF;
        
        -- Check if content column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'announcements' 
                       AND column_name = 'content') THEN
            -- Add the content column
            ALTER TABLE public.announcements 
            ADD COLUMN content TEXT NOT NULL DEFAULT 'No content provided';
        END IF;
        
        -- Check if created_at column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'announcements' 
                       AND column_name = 'created_at') THEN
            -- Add the created_at column
            ALTER TABLE public.announcements 
            ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
        -- Check if updated_at column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'announcements' 
                       AND column_name = 'updated_at') THEN
            -- Add the updated_at column
            ALTER TABLE public.announcements 
            ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
    ELSE
        -- Table doesn't exist, create it with all required columns
        CREATE TABLE public.announcements (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
            created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
    
    -- Create indexes if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'announcements_course_id_idx') THEN
        CREATE INDEX announcements_course_id_idx ON public.announcements(course_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'announcements_created_by_idx') THEN
        CREATE INDEX announcements_created_by_idx ON public.announcements(created_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'announcements_created_at_idx') THEN
        CREATE INDEX announcements_created_at_idx ON public.announcements(created_at);
    END IF;
    
END $$;

-- Enable RLS if not already enabled
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'admin_all_access') THEN
        DROP POLICY admin_all_access ON public.announcements;
    END IF;
    
    IF EXISTS (SELECT FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'faculty_read_all') THEN
        DROP POLICY faculty_read_all ON public.announcements;
    END IF;
    
    IF EXISTS (SELECT FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'faculty_write_own') THEN
        DROP POLICY faculty_write_own ON public.announcements;
    END IF;
    
    IF EXISTS (SELECT FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'student_read_all') THEN
        DROP POLICY student_read_all ON public.announcements;
    END IF;
END $$;

-- Create policies
CREATE POLICY admin_all_access ON public.announcements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

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
