-- Ensure class_sessions table has all required columns
DO $$
BEGIN
    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'class_sessions' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE class_sessions ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;

    -- Add reminder_sent column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'class_sessions' 
        AND column_name = 'reminder_sent'
    ) THEN
        ALTER TABLE class_sessions ADD COLUMN reminder_sent BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Create indexes for better performance
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'class_sessions'
        AND indexname = 'idx_class_sessions_created_by'
    ) THEN
        CREATE INDEX idx_class_sessions_created_by ON class_sessions(created_by);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'class_sessions'
        AND indexname = 'idx_class_sessions_course_id'
    ) THEN
        CREATE INDEX idx_class_sessions_course_id ON class_sessions(course_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'class_sessions'
        AND indexname = 'idx_class_sessions_start_time'
    ) THEN
        CREATE INDEX idx_class_sessions_start_time ON class_sessions(start_time);
    END IF;
END $$;

-- Update existing records to set created_by to a faculty member if possible
UPDATE class_sessions cs
SET created_by = (
    SELECT ta.user_id
    FROM teaching_assignments ta
    WHERE ta.course_id = cs.course_id
    LIMIT 1
)
WHERE cs.created_by IS NULL;

-- Set reminder_sent to false for all existing records if it's null
UPDATE class_sessions
SET reminder_sent = FALSE
WHERE reminder_sent IS NULL;
