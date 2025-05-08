-- Check if created_by column exists in class_sessions table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'class_sessions' 
        AND column_name = 'created_by'
    ) THEN
        -- Add created_by column to class_sessions table
        ALTER TABLE class_sessions ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;
END $$;

-- Create index on created_by column for better performance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'class_sessions'
        AND indexname = 'idx_class_sessions_created_by'
    ) THEN
        CREATE INDEX idx_class_sessions_created_by ON class_sessions(created_by);
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
